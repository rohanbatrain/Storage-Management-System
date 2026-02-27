/**
 * Sync manager for cross-device LAN synchronization.
 *
 * Uses mDNS (Bonjour/Zeroconf) to discover peer SMS instances on the LAN,
 * then periodically syncs data via REST API calls.
 */
const { Bonjour } = require('bonjour-service');
const http = require('http');

const SERVICE_TYPE = 'sms-sync';
const SYNC_INTERVAL_MS = 30_000; // 30 seconds

// Heuristic to ignore WSL, Docker, and VirtualBox subnets
function isPhysicalIp(ip) {
    if (!ip) return false;
    if (ip === '127.0.0.1' || ip === 'localhost') return false;
    // Common Docker/WSL ranges (172.16.x.x - 172.31.x.x) and Link-Local
    if (ip.startsWith('172.') || ip.startsWith('169.254.')) return false;

    // Accept typical physical LANs (192.168.x.x, 10.x.x.x)
    return true;
}

class SyncManager {
    constructor(port) {
        this.localPort = port;
        this.bonjour = new Bonjour();
        this.published = null;
        this.browser = null;
        this.peer = null; // Currently active primary peer
        this.peers = new Map(); // All discovered peers on the network
        this.syncTimer = null;
        this.lastSyncTimestamp = null;
        this.status = 'standalone'; // standalone | syncing | synced | error
        this.listeners = [];
    }

    /**
     * Start advertising this instance and browsing for peers.
     */
    start() {
        // Advertise our service
        this.published = this.bonjour.publish({
            name: `SMS-${require('os').hostname()}`,
            type: SERVICE_TYPE,
            port: this.localPort,
        });
        console.log(`[Sync] Advertising _${SERVICE_TYPE}._tcp on port ${this.localPort}`);

        this.browser = this.bonjour.find({ type: SERVICE_TYPE }, (service) => {
            // Ignore ourselves via port check
            if (service.port === this.localPort) return;

            const host = service.referer?.address || service.addresses?.[0];

            // Ignore virtual machine adapters (WSL, Docker, etc) so we don't sync with ourselves
            if (!isPhysicalIp(host)) return;

            const peerId = `${host}:${service.port}`;
            const newPeer = { host, port: service.port, name: service.name };

            this.peers.set(peerId, newPeer);
            console.log(`[Sync] Discovered peer: ${service.name} at ${peerId}`);

            // If this is the first peer, make it active
            if (!this.peer) {
                this.peer = newPeer;
                this._emit('peer-found', this.peer);
                this._startPeriodicSync();
            }

            this._emit('peers-updated', this.getPeers());
        });

        // Handle peer disappearing
        if (this.browser) {
            this.browser.on('down', (service) => {
                const host = service.referer?.address || service.addresses?.[0];
                if (!host) return;

                const peerId = `${host}:${service.port}`;
                if (this.peers.has(peerId)) {
                    this.peers.delete(peerId);
                    console.log(`[Sync] Peer disconnected: ${service.name} at ${peerId}`);
                    this._emit('peers-updated', this.getPeers());
                }

                if (this.peer && service.port === this.peer.port && host === this.peer.host) {
                    // Active peer was lost
                    this.peer = null;

                    // Try to fall back to another peer if available
                    if (this.peers.size > 0) {
                        const nextPeerId = this.peers.keys().next().value;
                        this.peer = this.peers.get(nextPeerId);
                        console.log(`[Sync] Fell back to next peer: ${this.peer.name}`);
                        this._emit('peer-found', this.peer);
                    } else {
                        this.status = 'standalone';
                        this._emit('peer-lost', null);
                        this._stopPeriodicSync();
                    }
                }
            });
        }
    }

    /**
     * Stop advertising and browsing.
     */
    stop() {
        this._stopPeriodicSync();
        if (this.published) {
            this.published.stop?.();
            this.published = null;
        }
        if (this.browser) {
            this.browser.stop?.();
            this.browser = null;
        }
        this.bonjour.destroy();
    }

    /**
     * Subscribe to sync events.
     * Events: 'peer-found', 'peer-lost', 'sync-start', 'sync-complete', 'sync-error', 'status-change'
     */
    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    _emit(event, data) {
        for (const l of this.listeners) {
            if (l.event === event) {
                try { l.callback(data); } catch (e) { /* ignore */ }
            }
        }
        // Also emit generic status
        if (['peer-found', 'peer-lost', 'sync-complete', 'sync-error'].includes(event)) {
            for (const l of this.listeners) {
                if (l.event === 'status-change') {
                    try { l.callback(this.getStatus()); } catch (e) { /* ignore */ }
                }
            }
        }
    }

    /**
     * Get current sync status.
     */
    getStatus() {
        return {
            status: this.status,
            peer: this.peer,
            lastSync: this.lastSyncTimestamp,
        };
    }

    /**
     * Get all currently discovered peers.
     */
    getPeers() {
        return Array.from(this.peers.values());
    }

    // ── Periodic sync ─────────────────────────────────────────────────────

    _startPeriodicSync() {
        if (this.syncTimer) return;
        // Run immediately, then every SYNC_INTERVAL_MS
        this._runSync();
        this.syncTimer = setInterval(() => this._runSync(), SYNC_INTERVAL_MS);
    }

    _stopPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    async _runSync() {
        if (!this.peer) return;

        this.status = 'syncing';
        this._emit('sync-start', null);

        try {
            // Step 1: Pull from peer
            const pullBody = JSON.stringify({
                since: this.lastSyncTimestamp || null,
                device_id: `local-${this.localPort}`,
            });

            const pullResult = await this._httpPost(
                this.peer.host,
                this.peer.port,
                '/api/sync/pull',
                pullBody
            );

            if (pullResult.records && pullResult.records.length > 0) {
                // Push the pulled records into our local backend
                const pushToLocal = JSON.stringify({
                    device_id: `peer-${this.peer.port}`,
                    records: pullResult.records,
                });
                await this._httpPost('127.0.0.1', this.localPort, '/api/sync/push', pushToLocal);
                console.log(`[Sync] Pulled ${pullResult.records.length} records from peer`);
            }

            // Step 2: Pull our local changes and push to peer
            const localPullBody = JSON.stringify({
                since: this.lastSyncTimestamp || null,
                device_id: `peer-${this.peer.port}`,
            });

            const localResult = await this._httpPost(
                '127.0.0.1',
                this.localPort,
                '/api/sync/pull',
                localPullBody
            );

            if (localResult.records && localResult.records.length > 0) {
                const pushToPeer = JSON.stringify({
                    device_id: `local-${this.localPort}`,
                    records: localResult.records,
                });
                await this._httpPost(this.peer.host, this.peer.port, '/api/sync/push', pushToPeer);
                console.log(`[Sync] Pushed ${localResult.records.length} records to peer`);
            }

            this.lastSyncTimestamp = new Date().toISOString();
            this.status = 'synced';
            this._emit('sync-complete', {
                pulled: pullResult.records?.length || 0,
                pushed: localResult.records?.length || 0,
            });

        } catch (err) {
            console.error('[Sync] Error during sync:', err.message);
            this.status = 'error';
            this._emit('sync-error', err.message);
        }
    }

    // ── HTTP helper ───────────────────────────────────────────────────────

    _httpPost(host, port, path, body) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: host,
                port,
                path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                },
                timeout: 10_000,
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        reject(new Error(`Invalid JSON from ${host}:${port}${path}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Timeout connecting to ${host}:${port}${path}`));
            });

            req.write(body);
            req.end();
        });
    }
}

module.exports = { SyncManager };

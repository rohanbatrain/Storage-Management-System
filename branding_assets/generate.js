const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const rootDir = '/Users/rohan/Documents/Personal-Storage-Management';
const assetsDir = path.join(rootDir, 'branding_assets');

async function main() {
    console.log('Generating mobile assets...');

    // Mobile app icon (1024x1024) opaque background
    await sharp(path.join(assetsDir, 'master-icon-dark-bg.svg'))
        .resize(1024, 1024)
        .png()
        .toFile(path.join(rootDir, 'mobile/assets/icon.png'));

    // Mobile adaptive icon (1024x1024) transparent background
    // Expo says foreground should be 1024x1024 but content centered in 66%
    // Our icon takes up most of 1024, so we need to add padding for adaptive
    await sharp(path.join(assetsDir, 'master-icon-white.svg'))
        .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(rootDir, 'mobile/assets/adaptive-icon.png'));

    // Mobile splash screen (1284x2778)
    // Create a blank 1284x2778 transparent canvas, composite the logo in center
    const splashLogo = await sharp(path.join(assetsDir, 'master-logo-horizontal.svg'))
        .resize({ width: 1000 })
        .toBuffer();

    await sharp({
        create: {
            width: 1284,
            height: 2778,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite([
            { input: splashLogo, gravity: 'center' }
        ])
        .png()
        .toFile(path.join(rootDir, 'mobile/assets/splash.png'));

    console.log('Generating web assets...');

    // Web Favicon
    fs.copyFileSync(
        path.join(assetsDir, 'master-icon-white.svg'),
        path.join(rootDir, 'web/public/favicon.svg') // Wait, we might need to create 'public' dir if it doesn't exist. Usually Vite has /public
    );

    // Make a temp 512x512 png config for favicons and apple touch
    await sharp(path.join(assetsDir, 'master-icon-white.svg'))
        .resize(180, 180)
        .png()
        .toFile(path.join(rootDir, 'web/public/apple-touch-icon.png'));

    const ogLogo = await sharp(path.join(assetsDir, 'master-logo-horizontal.svg'))
        .resize({ width: 1000 })
        .toBuffer();

    // Generate a big OG image 1200x630
    await sharp({
        create: { width: 1200, height: 630, channels: 4, background: { r: 15, g: 15, b: 20, alpha: 1 } }
    })
        .composite([
            { input: ogLogo, gravity: 'center' }
        ])
        .png()
        .toFile(path.join(rootDir, 'web/public/og-image.png'));

    console.log('Generating Electron desktop assets...');
    // Ensure build dir
    const electronBuildDir = path.join(rootDir, 'electron/build');
    if (!fs.existsSync(electronBuildDir)) fs.mkdirSync(electronBuildDir, { recursive: true });

    await sharp(path.join(assetsDir, 'master-icon-dark-bg.svg'))
        .resize(512, 512)
        .png()
        .toFile(path.join(electronBuildDir, 'icon.png'));

    console.log('Generating ICO for Electron...');
    const icoBuf = await pngToIco(path.join(electronBuildDir, 'icon.png'));
    fs.writeFileSync(path.join(electronBuildDir, 'icon.ico'), icoBuf);


    // macOS ICNS generation: Need an iconset folder
    console.log('Generating ICNS for macOS...');
    const iconsetDir = path.join(assetsDir, 'icon.iconset');
    if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir);

    const sizes = [16, 32, 64, 128, 256, 512];
    for (const size of sizes) {
        for (const scale of [1, 2]) {
            const s = size * scale;
            const tId = scale === 1 ? `icon_${size}x${size}.png` : `icon_${size}x${size}@2x.png`;
            await sharp(path.join(assetsDir, 'master-icon-dark-bg.svg'))
                .resize(s, s)
                .png()
                .toFile(path.join(iconsetDir, tId));
        }
    }

    // We'll run iconutil externally to compile .appiconset to .icns
    console.log('Done script. Run iconutil manually.');
}

main().catch(console.error);

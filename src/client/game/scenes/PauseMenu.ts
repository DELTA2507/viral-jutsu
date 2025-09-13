import { Scene } from 'phaser';
import { Casual } from './Casual';
import { Ranked } from './Ranked';

export class PauseMenu extends Scene {
    parentScene!: Casual | Ranked;
    bg!: Phaser.GameObjects.Rectangle;
    resumeBtn!: Phaser.GameObjects.Text;
    exitBtn!: Phaser.GameObjects.Text;
    soundContainer!: Phaser.GameObjects.Container;
    spacePressed = false;

    constructor() { super('PauseMenu'); }

    init(data: any) { this.parentScene = data.parentScene; }

    create() {
        const { width, height } = this.scale;
        this.bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

        const hoverTint = 0x9966ff;
        const buttonStyle = {
            fontFamily: 'Helvetica',
            fontSize: '32px',
            color: '#fff'
        };

        const createButton = (text: string, callback: () => void) => {
            const btn = this.add.text(0, 0, text, buttonStyle)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .setStroke('#000', 4)
                .setShadow(2, 2, '#000', 2, true, true);

            btn.on('pointerover', () => btn.setTint(hoverTint));
            btn.on('pointerout', () => btn.clearTint());
            btn.on('pointerdown', callback);
            return btn;
        };

        this.resumeBtn = createButton('Resume', () => {
            this.scene.stop();
            this.parentScene.togglePause();
        });

        this.exitBtn = createButton('Exit', () => {
            if (this.parentScene instanceof Casual) this.scene.stop('Casual');
            if (this.parentScene instanceof Ranked) this.scene.stop('Ranked');
            this.scene.start('MainMenu');
        });

        // --- Sound Button Container ---
        const soundText = this.add.text(0, 0, 'Sound:', { fontFamily: 'Helvetica', fontSize: '32px', color: '#fff' })
            .setOrigin(0, 0.5)
            .setShadow(2, 2, '#000', 2, true, true);
        const soundIcon = this.add.image(soundText.width + 10, 0, this.registry.get('SoundActive') ? 'sound_on' : 'sound_off')
            .setOrigin(0, 0.5)
            .setDisplaySize(32, 32);

        this.soundContainer = this.add.container(0, 0, [soundText, soundIcon]);

        const padding = 10;
        const soundWidth = soundText.width + padding + soundIcon.displayWidth;
        soundText.setX(-soundWidth / 2);
        soundIcon.setX(soundText.x + soundText.width + padding);

        // centramos el container según su contenido
        const bounds = this.soundContainer.getBounds();
        soundText.setX(-bounds.width / 2);
        soundIcon.setX(soundText.x + soundText.width + 10);

        // hacemos interactivo TODO el container
        this.soundContainer.setSize(soundWidth, soundText.height);
        this.soundContainer.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                const current = this.registry.get('SoundActive') ?? true;
                const newState = !current;
                this.registry.set('SoundActive', newState);
                soundIcon.setTexture(newState ? 'sound_on' : 'sound_off');
            })
            .on('pointerover', () => {
                soundText.setTint(hoverTint);
            })
            .on('pointerout', () => {
                soundText.clearTint();
            });

        this.positionElements(width, height);

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive()) return;
            this.positionElements(gameSize.width, gameSize.height);
        });

        this.input.keyboard?.on('keydown-SPACE', () => {
            if (!this.spacePressed) {
                this.spacePressed = true;
                this.scene.stop();
                this.parentScene.togglePause();
            }
        });

        this.events.on('shutdown', () => { this.spacePressed = false; });
    }

    positionElements(width: number, height: number) {
        if (this.bg) this.bg.setSize(width, height).setPosition(0, 0);

        const centerX = width / 2;
        const centerY = height / 2;
        const spacing = 100;

        this.soundContainer.setPosition(centerX, centerY - spacing);
        this.resumeBtn.setPosition(centerX, centerY);
        this.exitBtn.setPosition(centerX, centerY + spacing);
    }
}
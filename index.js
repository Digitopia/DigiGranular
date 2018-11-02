class App {

    constructor() {
        this.init()
    }

    init() {
        this.sound = 'sounds/speech.wav'
        this.initWave()
        this.initAudio()
        this.initUi()
    }

    initWave() {

        this.wave = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'lightgrey',
            progressColor: 'lightgrey',
            cursorColor: 'rgba(0, 0, 0, 0.3)',
            cursorWidth: 1,
            height: 220,
            normalize: true,
            plugins: [
                // WaveSurfer.cursor.create(),
                WaveSurfer.regions.create({}),
            ],
        })

        this.wave.on('ready', () => {
            this.wave.addRegion({
                start: 1,
                end: 2,
                drag: true,
                resize: true,
            })
            this.wave.addRegion({
                start: 0.2,
                end: 0.5,
                drag: false,
                resize: true,
                color: 'rgba(42, 186, 186, 0.3)',
            })
            this.wave.addRegion({
                start: 3.1,
                end: 3.4,
                drag: false,
                resize: false,
                color: 'rgba(200, 100, 50, 0.4)',
            })
        })

        this.wave.load(this.sound)

        this.wave.on('seek', (progress) => {
            console.log('seeked', progress)
            const t = this.grainPlayer.buffer.duration * progress
            console.log('t', t)
            this.grainPlayer.loopStart = t
            this.grainPlayer.loopEnd = t + this.grainPlayer.grainSize
            this.grainPlayer.start(0, t)
        })

    }

    initAudio() {

        this.grainPlayer = new Tone.GrainPlayer({
            url: this.sound,
            onload: Tone.noOp,
            overlap: 1,
            grainSize: 0.1,
            playbackRate: 1,
            detune: 0,
            loop: true,
            // loopStart: 0.1,
            // loopEnd: 0.2,
            reverse: false,
        }).toMaster()

    }

    initUi() {

        new Nexus.Slider('#grainSize', {
            size: [100, 20],
            mode: 'relative', // 'absolute
            min: 0.001,
            max: 1,
            step: 0.01,
            value: 0.3,
        }).on('change', (v) => {
            console.log(v)
            this.grainPlayer.grainSize = v
            this.grainPlayer.loopEnd = this.grainPlayer.loopStart + this.grainPlayer.grainSize
        })

        new Nexus.Slider('#playbackRate', {
            size: [100, 20],
            mode: 'relative', // 'absolute
            min: 0,
            max: 2,
            step: 0.01,
            value: 1,
        }).on('change', (v) => {
            this.grainPlayer.playbackRate = v
        })

        new Nexus.Slider('#overlap', {
            size: [100, 20],
            mode: 'relative', // 'absolute
            min: 0,
            max: 1,
            step: 0.01,
            value: 0.5,
        }).on('change', (v) => {
            this.grainPlayer.overlap = v
        })

        new Nexus.Slider('#detune', {
            size: [100, 20],
            mode: 'relative', // 'absolute
            min: -1200,
            max: 1200,
            step: 1,
            value: 0,
        }).on('change', (v) => {
            this.grainPlayer.detune = v
        })

        new Nexus.Toggle('#reverse', {
            size: [40, 20],
            state: false,
        }).on('change', (v) => {
            this.grainPlayer.reverse = v
        })

    }

}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App()
})

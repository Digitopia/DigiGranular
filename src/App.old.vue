<template>
    <div id="app">
        <div class="container">
            <div id="waveform"></div>

            <div id="buttons">
                <label for="reverse">reverse</label>
                <div id="reverse"></div>

                <label for="grainSize">grainSize</label>
                <div id="grainSize"></div>

                <label for="overlap">overlap</label>
                <div id="overlap"></div>

                <label for="detune">detune</label>
                <div id="detune"></div>

                <label for="playbackRate">playbackRate</label>
                <div id="playbackRate"></div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'App',

    mounted() {
        this.init()
    },

    methods: {
        init() {
            this.sound = 'sounds/speech.wav'
            this.initWave()
            this.initAudio()
            this.initUi()
        },

        initWave() {
            this.wave = window.WaveSurfer.create({
                container: '#waveform',
                waveColor: 'lightgrey',
                progressColor: 'grey',
                cursorColor: 'rgba(0, 0, 0, 0.3)',
                cursorWidth: 1,
                height: 220,
                normalize: true,
                plugins: [
                    // WaveSurfer.cursor.create(),
                    window.WaveSurfer.regions.create({}),
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

            this.wave.on('seek', progress => {
                console.log('seeked', progress)
                const t = this.grainPlayer.buffer.duration * progress
                console.log('t', t)
                this.grainPlayer.loopStart = t
                this.grainPlayer.loopEnd = t + this.grainPlayer.grainSize
                this.grainPlayer.start(0, t)
            })
        },

        initAudio() {
            this.grainPlayer = new window.Tone.GrainPlayer({
                url: this.sound,
                onload: window.Tone.noOp,
                overlap: 1,
                grainSize: 0.1,
                playbackRate: 1,
                detune: 0,
                loop: true,
                // loopStart: 0.1,
                // loopEnd: 0.2,
                reverse: false,
            }).toMaster()
        },

        initUi() {
            new window.Nexus.Slider('#grainSize', {
                size: [100, 20],
                mode: 'relative', // 'absolute
                min: 0.001,
                max: 1,
                step: 0.01,
                value: 0.3,
            }).on('change', v => {
                console.log(v)
                this.grainPlayer.grainSize = v
                this.grainPlayer.loopEnd =
                    this.grainPlayer.loopStart + this.grainPlayer.grainSize
            })

            new window.Nexus.Slider('#playbackRate', {
                size: [100, 20],
                mode: 'relative', // 'absolute
                min: 0,
                max: 2,
                step: 0.01,
                value: 1,
            }).on('change', v => {
                this.grainPlayer.playbackRate = v
            })

            new window.Nexus.Slider('#overlap', {
                size: [100, 20],
                mode: 'relative', // 'absolute
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.5,
            }).on('change', v => {
                this.grainPlayer.overlap = v
            })

            new window.Nexus.Slider('#detune', {
                size: [100, 20],
                mode: 'relative', // 'absolute
                min: -1200,
                max: 1200,
                step: 1,
                value: 0,
            }).on('change', v => {
                this.grainPlayer.detune = v
            })

            new window.Nexus.Toggle('#reverse', {
                size: [40, 20],
                state: false,
            }).on('change', v => {
                this.grainPlayer.reverse = v
            })
        },
    },
}
</script>

<style lang="scss">
#app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    // text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}

.container {
    width: 80%;
    max-width: 800px;
    min-width: 300px;
    margin: 0 auto;
    margin-top: 150px;
}

#buttons {
    margin-top: 50px;
}

#reverse,
#grainSize,
#overlap,
#detune,
#playbackRate {
    margin-bottom: 20px;
}
</style>

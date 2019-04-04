<template>
    <div id="app">
        <div class="waveform-wrapper">
            <div id="waveform"></div>
            <canvas id="canvas" ref="canvas" @click="click"></canvas>
        </div>

        <div id="presets">
            <div
                v-for="(sound, index) in sounds"
                :key="index"
                class="preset"
                :class="{ active: index === soundActiveIdx }"
                @click="soundActiveIdx = index"
            >
                <div>{{ index + 1 }}</div>
            </div>
        </div>
        <div id="controls">
            <div v-for="param in params" :key="param.label" class="control">
                <span v-tooltip="`${param.tooltip}`"
                    >{{ param.label }}
                    <small style="text-align: right"
                        >({{ param.value }})</small
                    ></span
                >
                <input
                    v-model.number="param.value"
                    type="range"
                    class="slider"
                    :min="param.min"
                    :max="param.max"
                    :step="param.step"
                    @dblclick="param.value = param.default"
                />
            </div>
            <div class="control">
                <span>Envelope</span>
                <input v-model="useEnvelope" type="checkbox" />
            </div>
        </div>
    </div>
</template>

<script>
import WaveSurfer from 'wavesurfer.js'

import utils from '@/utils.js'

export default {
    data() {
        return {
            useEnvelope: true,
            params: {
                grainSize: {
                    min: 0.01,
                    max: 0.2,
                    step: 0.001,
                    default: 0.1,
                    value: 0.1,
                    label: 'Grain Size',
                    tooltip: 'How big the grain? (10ms-200ms)',
                },
                pitchShift: {
                    min: 0.1,
                    max: 2,
                    step: 0.01,
                    default: 1,
                    value: 1,
                    label: 'Pitch Shift',
                    tooltip: 'Change playbackRate of grain',
                },
                pan: {
                    min: 0,
                    max: 1,
                    step: 0.1,
                    default: 0.5,
                    value: 0.5,
                    label: 'Pan',
                    tooltip: 'Pan much or not really?',
                },
                density: {
                    min: 1,
                    max: 30,
                    step: 0.1,
                    default: 3,
                    value: 3,
                    label: 'Density',
                    tooltip: 'How many grains per second? (1-10)',
                },
                randomness: {
                    min: 0,
                    max: 6,
                    step: 0.1,
                    default: 3,
                    value: 3,
                    label: 'Randomness',
                    tooltip:
                        'How far from original point? (up to 6 times size of maximum grain either way)',
                },
            },
            envelope: {
                attack: 0.002,
                release: 0.002,
            },
            sounds: [
                '/sounds/speech.wav',
                '/sounds/guitar.wav',
                '/sounds/bonang.wav',
                '/sounds/bird.wav',
            ],
            soundActiveIdx: 0,
            dragging: false,
            buffer: null,
            ctx: null,
            canvasCtx: null,
            canvas: null,
            grains: [],
            master: null,
            origin: null,
        }
    },

    computed: {
        grainSize() {
            return this.params.grainSize.value
        },

        pitchShift() {
            return this.params.pitchShift.value
        },

        rate() {
            return this.params.rate.value
        },

        pan() {
            return this.params.pan.value
        },

        density() {
            return this.params.density.value
        },

        randomness() {
            return this.params.randomness.value
        },

        x() {
            return this.origin.x
        },
    },

    watch: {
        soundActiveIdx(newIdx, oldIdx) {
            if (newIdx === oldIdx) return
            this.soundActiveIdx = newIdx
            this.changeSound(newIdx)
        },

        origin() {
            console.log('origin changed', this.origin)
            this.updateInterval()
        },

        density() {
            this.updateInterval()
        },
    },

    created() {
        document.addEventListener('keypress', evt => {
            switch (evt.key) {
                case '1':
                case '2':
                case '3':
                case '4':
                    this.soundActiveIdx = evt.key - 1
            }
        })
    },

    mounted() {
        this.initWave()
        this.initCanvas()

        window.addEventListener('resize', () => {
            this.resize()
        })

        this.master = this.ctx.createGain()
        this.master.connect(this.ctx.destination)
    },

    methods: {
        changeSound(index) {
            console.log('changeSound')
            this.wave.load(this.sounds[index])
            const { ac: ctx } = this.wave.backend
            this.ctx = ctx
        },

        resize() {
            this.width = this.canvas.clientWidth
            this.height = this.canvas.clientHeight
            this.canvas.setAttribute('width', this.width)
            this.canvas.setAttribute('height', this.height)
        },

        initCanvas() {
            this.canvas = this.$refs.canvas
            this.canvasCtx = this.canvas.getContext('2d')
            this.resize()
        },

        initWave() {
            this.wave = WaveSurfer.create({
                container: '#waveform',
                waveColor: 'rgba(255, 128, 0, 155)',
                progressColor: 'transparent',
                height: 200,
                barHeight: 1,
                barWidth: 1,
                cursorWidth: 0,
            })
            this.wave.on('ready', () => {
                this.buffer = this.wave.backend.buffer
            })
            window.wave = this.wave

            this.changeSound(this.soundActiveIdx)
        },

        click(e) {
            const x = e.offsetX
            const y = e.offsetY
            this.origin = { x, y }
        },

        addGrain() {
            console.log('Adding grain at', this.origin)

            // Determine where to read the grain from
            const baseOffset = utils.map(
                this.x,
                0,
                this.width,
                0,
                this.buffer.duration
            )
            const randOffsetRange = this.randomness * this.params.grainSize.max
            const randOffset =
                utils.randomFloat(0, randOffsetRange) - randOffsetRange / 2
            const grainOffset = utils.clamp(
                baseOffset + randOffset,
                0,
                this.buffer.duration
            )

            const now = this.ctx.currentTime

            // Create a grain buffer
            const source = this.ctx.createBufferSource()
            source.buffer = this.buffer
            source.playbackRate.value = this.pitchShift
            source.addEventListener('ended', () => {
                this.grains.pop()
            })

            // Create panner node
            const panner = this.ctx.createPanner()
            panner.panningModel = 'equalpower'
            panner.distanceModel = 'linear'
            const pannerX = utils.randomFloat(this.pan * -1, this.pan)
            panner.setPosition(pannerX, 0, 0)

            // Create gain node
            let gain
            if (this.useEnvelope) {
                gain = this.ctx.createGain()
                source.connect(panner)
                panner.connect(gain)
                gain.connect(this.master)
            } else {
                source.connect(panner)
                panner.connect(this.master)
            }

            // Play grain
            source.start(now, grainOffset, this.grainSize)

            // Set envelope (triangular for now)
            if (this.useEnvelope) {
                gain.gain.setValueAtTime(0, now)
                const attackOffset = now + this.envelope.attack
                const releaseOffset =
                    attackOffset + this.grainSize - this.envelope.release
                console.log({
                    now,
                    attackOffset,
                    releaseOffset,
                    grainSize: this.grainSize,
                })
                gain.gain.linearRampToValueAtTime(1, attackOffset)
                gain.gain.linearRampToValueAtTime(0, releaseOffset)
            }

            // Cleanup nodes after having played
            // TODO:

            // Draw grain
            const grainX = utils.map(
                grainOffset,
                0,
                this.buffer.duration,
                0,
                this.width
            )
            this.grains[0] = { x: grainX }
            // this.grains.push({ x: grainX })
            this.drawGrains()
        },

        drawGrains() {
            this.canvasCtx.clearRect(0, 0, this.width, this.height)
            for (let i = 0; i < this.grains.length; i++) {
                const { x } = this.grains[i]
                this.canvasCtx.fillStyle = 'rgba(255,0,0,0.7)'
                const size = Math.max(
                    5,
                    (this.width / this.buffer.duration) * this.grainSize
                )
                this.canvasCtx.fillRect(
                    x - size / 2,
                    this.height / 2 - size / 2,
                    size,
                    size
                )
            }
        },

        updateInterval() {
            window.clearInterval(this.interval)
            this.interval = window.setInterval(() => {
                this.addGrain()
            }, 1000 / this.density)
        },
    },
}
</script>

<style lang="scss">
@import 'tooltip.scss';

:root {
    --bg: rgb(29, 29, 29);
    --fg: rgb(63, 63, 63);
    --accent: rgb(197, 197, 197);
    --waveColor: rgba(255, 128, 0, 155);
}
.controls {
    background: var(--fg);
}
html,
body {
    background: var(--bg);
    color: var(--accent);
    font-family: 'Avenir';
}

#app {
    margin: 0 auto;
    max-width: 800px;
    display: grid;
    grid-template-columns: 11fr 1fr;
}

#canvas {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
    height: 200px;
    z-index: 1000;
}

.row {
    display: flex;
}

#presets {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    flex: 1;
    .preset {
        display: flex;
        justify-content: center;
        align-items: center;
        &:hover,
        &.active {
            background: var(--accent);
            color: var(--bg);
            cursor: pointer;
        }
        background: var(--fg);
        justify-self: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-left: 5px;
    }
}

.waveform-wrapper {
    position: relative;
}

#waveform {
    height: 200px;
    width: 100%;
    background: var(--fg);
}

.slider {
    -webkit-appearance: none;
    width: 100%;
    height: 25px;
    background: var(--fg);
    outline: none;
    opacity: 0.7;
    -webkit-transition: 0.2s;
    transition: opacity 0.2s;
}

.slider:hover {
    opacity: 1;
}

.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 25px;
    height: 25px;
    background: var(--accent);
    cursor: pointer;
}

.slider::-moz-range-thumb {
    width: 25px;
    height: 25px;
    background: var(--accent);
    cursor: pointer;
}

#controls {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-gap: 20px;
    .control {
        font-size: 12px;
    }
}

* {
    user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
    -o-user-select: none;
    -moz-user-select: none;
    -webkit-tap-highlight-color: transparent !important;
    box-sizing: border-box;
    &:focus {
        outline: none !important;
    }
}
</style>

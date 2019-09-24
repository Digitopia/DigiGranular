<template>
    <div id="app" class="container">
        <div id="presets">
            <div
                v-for="(_, idx) in sounds"
                :key="idx"
                class="preset btn"
                :class="{ active: idx === soundActiveIdx }"
                @click="soundActiveIdx = idx"
            >
                <div>{{ idx + 1 }}</div>
            </div>
            <div class="preset stop btn" @click="stop">
                <i class="fa fa-stop"></i>
            </div>
        </div>

        <div id="waveform-wrapper">
            <div id="waveform"></div>
            <canvas id="canvas" ref="canvas" @click="click"></canvas>
        </div>

        <div id="controls" class="my-3 row">
            <div
                v-for="param in params"
                :key="param.label"
                class="control col-6 col-md-4 px-2 px-md-4 mb-3"
            >
                <!-- <span v-tooltip="`${param.tooltip}`"></span>-->
                <label for="range" class="mb-0">
                    {{ param.label }}
                    <!-- <small style="text-align: right">({{ param.value }})</small> -->
                </label>
                <input
                    id="range"
                    v-model.number="param.value"
                    type="range"
                    class="slider"
                    :min="param.min"
                    :max="param.max"
                    :step="param.step"
                    @dblclick="param.value = param.default"
                />
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
                    max: 1,
                    step: 0.01,
                    default: 0.1,
                    value: 0.1,
                    label: 'Grain Size',
                    tooltip: 'How big the grain? (10ms-200ms)',
                },
                pitchShift: {
                    min: 0,
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
                    step: 0.01,
                    default: 0.5,
                    value: 0.5,
                    label: 'Pan',
                    tooltip: 'Pan much or not really?',
                },
                // density: {
                //     min: 1,
                //     max: 30,
                //     step: 0.1,
                //     default: 3,
                //     value: 3,
                //     label: 'Density',
                //     tooltip: 'How many grains per second? (1-10)',
                // },
                overlap: {
                    min: 0,
                    max: 1,
                    step: 0.01,
                    default: 0,
                    value: 0,
                    label: 'Overlap',
                },
                randomness: {
                    min: 0,
                    max: 1,
                    step: 0.01,
                    default: 0.5,
                    value: 0.5,
                    label: 'Randomness',
                    tooltip: 'How far from original point?',
                },
                reverse: {
                    min: 0,
                    max: 1,
                    step: 0.01,
                    default: 0.5,
                    value: 0.5,
                    label: 'Reverse',
                    tooltip: 'Probability of reading buffer in reverse',
                },
            },
            envelope: {
                attack: 0.002,
                release: 0.002,
            },
            sounds: [
                '/sounds/speech.wav',
                '/sounds/bird.wav',
                '/sounds/guitar.wav',
                '/sounds/bonang.wav',
            ],
            soundActiveIdx: 0,
            dragging: false,
            buffers: [],
            reverseBuffers: [],
            ctx: null,
            canvasCtx: null,
            canvas: null,
            grains: [],
            master: null,
            width: null,
            origin: {
                x: null,
                y: null,
            },
        }
    },

    computed: {
        grainSize() {
            return this.params.grainSize.value
        },

        pitchShift() {
            return this.params.pitchShift.value
        },

        pan() {
            return this.params.pan.value
        },

        // density() {
        //     return this.params.density.value
        // },

        overlap() {
            return this.params.overlap.value
        },

        randomness() {
            return this.params.randomness.value
        },

        reverse() {
            return this.params.reverse.value
        },

        x() {
            if (!this.origin || !this.origin.x) return null
            return this.width * this.origin.x
        },

        isPlaying() {
            return this.origin !== null
        },
    },

    watch: {
        soundActiveIdx() {
            this.changeSound(this.soundActiveIdx)
        },

        origin() {
            this.updateInterval()
        },

        // density() {
        //     this.updateInterval()
        // },

        grainSize() {
            this.updateInterval()
        },

        overlap() {
            this.updateInterval()
        },
    },

    created() {
        this.params.reverse.value = 0
        this.params.randomness.value = 0
        this.params.pan.value = 0
        document.addEventListener('keypress', evt => {
            switch (evt.key) {
                case '1':
                case '2':
                case '3':
                case '4':
                    this.soundActiveIdx = evt.key - 1
                    break
                case ' ':
                    this.stop()
                    break
                default:
                    break
            }
        })

        const AudioContext = window.AudioContext || window.webkitAudioContext
        this.ctx = new AudioContext()
        window.ctx = this.ctx
        this.loadBuffers()
    },

    mounted() {
        this.initWave()
        this.initCanvas()

        window.addEventListener('resize', () => {
            this.resize()
        })

        this.master = this.ctx.createGain()
        this.master.connect(this.ctx.destination)

        setTimeout(() => {
            this.resize()
        }, 200)
    },

    methods: {
        loadBuffers() {
            this.sounds.forEach((sound, index) => {
                const req = new XMLHttpRequest()
                req.open('GET', sound, true)
                req.responseType = 'arraybuffer'
                req.onload = () => {
                    const audioData = req.response
                    this.ctx.decodeAudioData(
                        audioData,
                        buffer => {
                            this.buffers[index] = buffer

                            if (index === 0) this.changeSound(0)

                            // Clone buffer
                            const clonedBuffer = this.ctx.createBuffer(
                                1,
                                buffer.length,
                                buffer.sampleRate
                            )
                            const bufferData = clonedBuffer.getChannelData(0)
                            for (let i = 0; i < buffer.length; i++) {
                                bufferData[i] = buffer.getChannelData(0)[i]
                            }

                            // Reverse it
                            Array.prototype.reverse.call(
                                clonedBuffer.getChannelData(0)
                            )
                            this.reverseBuffers[index] = clonedBuffer
                        },
                        err => {
                            console.log(
                                'Error with decoding audio data',
                                err.err
                            )
                        }
                    )
                }
                req.send()
            })
        },

        changeSound(index) {
            this.wave.loadDecodedBuffer(this.buffers[index])
        },

        resize() {
            this.width = this.canvas.clientWidth
            this.height = this.canvas.clientHeight
            this.canvas.setAttribute('width', this.width)
            this.canvas.setAttribute('height', this.height)
            this.wave.setHeight(this.height)
        },

        initCanvas() {
            this.canvas = this.$refs.canvas
            this.canvasCtx = this.canvas.getContext('2d')
            this.resize()
        },

        initWave() {
            this.wave = WaveSurfer.create({
                container: '#waveform',
                waveColor: '#ff8000',
                progressColor: 'transparent',
                barHeight: 1,
                barWidth: 1,
                fillParent: true,
                cursorWidth: 0,
                audioContext: this.ctx,
            })
            window.wave = this.wave
        },

        click(e) {
            const x = e.offsetX
            const y = e.offsetY
            const ratioX = x / this.width
            const ratioY = y / this.height
            this.origin = { x: ratioX, y: ratioY }
            this.ctx.resume()
        },

        stop() {
            this.origin = null
            this.clearCanvas()
            window.clearInterval(this.interval)
        },

        addGrain() {
            // console.log('Adding grain at', this.origin)

            this.buffer =
                Math.random() <= this.reverse
                    ? this.reverseBuffers[this.soundActiveIdx]
                    : this.buffers[this.soundActiveIdx]

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
            // NOTE: using PannerNode instead of StereoPannerNode, since still no support in Safari
            const pan = utils.randomFloat(this.pan * -1, this.pan)
            console.log({ pan })
            const skipStereoPanner = true
            let panner
            if (!skipStereoPanner && this.ctx.createStereoPanner) {
                panner = this.ctx.createStereoPanner()
                panner.pan.value = pan
            } else {
                console.log('faling back to pannerNode')
                panner = this.ctx.createPanner()
                panner.panningModel = 'equalpower'
                panner.setPosition(pan, 0, 1 - Math.abs(pan))
                // panner.setPosition(pan, 1, 1)
            }

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
                // console.log({
                //     now,
                //     attackOffset,
                //     releaseOffset,
                //     grainSize: this.grainSize,
                // })
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

        clearCanvas() {
            this.canvasCtx.clearRect(0, 0, this.width, this.height)
        },

        drawGrains() {
            this.clearCanvas()

            this.canvasCtx.fillStyle = 'rgba(10, 10, 10, 0.4)'
            this.canvasCtx.beginPath()
            const r = 5
            this.canvasCtx.arc(this.x, this.height / 2, r, 0, 2 * Math.PI)
            // this.canvasCtx.stroke()
            this.canvasCtx.fill()

            for (let i = 0; i < this.grains.length; i++) {
                const { x } = this.grains[i]
                this.canvasCtx.fillStyle = 'rgba(197, 197, 197, 0.8)'

                // rect
                const minW = 5
                const w = (this.width / this.buffer.duration) * this.grainSize
                const h = 20
                const size = Math.max(minW, w)
                this.canvasCtx.fillRect(
                    x - w / 2,
                    this.height / 2 - h / 2,
                    size,
                    h
                )

                // circle
                // const minW = 5
                // const w = (this.width / this.buffer.duration) * this.grainSize
                // const size = Math.max(minW, w)
                // this.canvasCtx.beginPath()
                // const r =
                //     ((this.width / this.buffer.duration) * this.grainSize) / 2
                // this.canvasCtx.arc(x, this.height / 2, r, 0, 2 * Math.PI)
                // // this.canvasCtx.stroke()
                // this.canvasCtx.fill()
            }
        },

        updateInterval() {
            // density version
            // if (!this.origin) return
            // window.clearInterval(this.interval)
            // this.interval = window.setInterval(() => {
            //     this.addGrain()
            // }, 1000 / this.density)

            // overlap version
            const intervalSeconds = utils.map(
                this.overlap,
                this.params.overlap.min,
                this.params.overlap.max,
                this.grainSize,
                this.grainSize / 2
            )
            if (!this.origin) return
            window.clearInterval(this.interval)
            this.interval = window.setInterval(() => {
                this.addGrain()
            }, intervalSeconds * 1000)
        },
    },
}
</script>

<style lang="scss">
@import 'tooltip.scss';

:root {
    --bg: #1d1d1d;
    --fg: #3f3f3f;
    --accent: #c5c5c5;
    --wave-color: #ff8000;
    --slider-size: 38px;
    --border-radius: 40px;
}

* {
    box-sizing: border-box;
    &:focus {
        outline: none !important;
    }
}

html {
    position: relative;
    min-height: 100vh;
}

html,
body {
    background: var(--bg);
    color: var(--accent);
    font-family: 'Roboto Mono', sans-serif;
}

h1 {
    color: var(--wave-color) !important;
}

#app {
    padding-bottom: 60px; // NOTE: footer height
}

#waveform-wrapper {
    position: relative;
    #waveform,
    #canvas {
        border-radius: calc(var(--border-radius) / 2);
    }

    #canvas {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
        z-index: 1000;
    }

    #waveform {
        width: 100%;
        background: var(--fg);
    }
}

#presets {
    display: flex;
}

.preset {
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--fg);
    width: 3rem;
    height: 3rem;
    font-size: 22px;
    border-radius: 50%;
    margin-right: 10px;
    margin-bottom: 10px;

    &:hover,
    &.active {
        background: var(--accent);
        color: var(--bg);
        cursor: pointer;
    }

    &.stop {
        margin-right: 0;
        margin-left: auto;
    }
}

#controls {
    .control {
        font-size: 1.2rem;
        text-transform: uppercase;
        text-align: center;
    }
}

footer {
    position: absolute;
    bottom: 0;
    text-align: center;
    margin: 0 auto !important;
    width: 100%;
    a {
        color: var(--accent);
        &:hover {
            color: var(--wave-color);
        }
    }
}

.slider {
    -webkit-appearance: none;
    width: 100%;
    height: var(--slider-size);
    background: var(--fg);
    outline: none;
    opacity: 0.7;
    -webkit-transition: 0.2s;
    transition: opacity 0.2s;
    border-radius: var(--border-radius);

    &:hover {
        opacity: 1;
    }

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: var(--slider-size);
        height: var(--slider-size);
        background: var(--accent);
        cursor: pointer;
        border-radius: var(--border-radius);
    }

    &::-moz-range-thumb {
        width: var(--slider-size);
        height: var(--slider-size);
        background: var(--accent);
        cursor: pointer;
        border-radius: var(--border-radius);
    }
}
</style>

export default class {
    static map(value, start1, stop1, start2, stop2) {
        return ((value - start1) / (stop1 - start1)) * (stop2 - start2) + start2
    }

    static clamp(value, min, max) {
        return Math.min(max, Math.max(min, value))
    }

    static randomFloat(min, max) {
        return Math.random() * (max - min) + min
    }

    static swap(a, x, y) {
        if (a.length === 1) return a
        a.splice(y, 1, a.splice(x, 1, a[y])[0])
        return a
    }

    static modulo(x, m) {
        return ((x % m) + m) % m
    }
}

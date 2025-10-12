import 'fake-indexeddb/auto'

// Polyfill Blob.text() for jsdom environment
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = async function () {
    const reader = new FileReader()
    return new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(this)
    })
  }
}

// Polyfill File.text() for jsdom environment
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = async function () {
    const reader = new FileReader()
    return new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(this)
    })
  }
}

// Mock URL.createObjectURL and revokeObjectURL for jsdom
if (typeof URL !== 'undefined') {
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => {
      return `blob:mock-${Math.random()}`
    }
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {}
  }
}

// Mock window.matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
})

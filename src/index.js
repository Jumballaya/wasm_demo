const newCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

const getPixels = (img) => {
    const cvs = newCanvas(img.naturalWidth, img.naturalHeight);
    const ctx = cvs.getContext('2d');
    if (!ctx) return new ImageData(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, cvs.width, cvs.height);
}

const data2src = (data, encoding = 'image/png') => {
    const img = document.createElement('img');
    img.width = data.width;
    img.height = data.height;
    const c = newCanvas(data.width, data.height);
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    ctx.putImageData(data, 0, 0);
    return c.toDataURL(encoding);
}

const genSharpen = (n) => {
    const d = (n * 2) + 1;
    const arr = (new Array(d*d)).fill(0);
    // set top middle to -1
    arr[n] = -1.0;
    // set left side -1
    arr[(n * d)] = -1.0;
    // set right side to -1
    arr[(d*(n+1)) - 1] = -1.0;
    // set bottom to -1
    arr[(d * (d -1)) + n] = -1.0;
    // Set center to the adjustment
    arr[(d * n) + n] = 5.0;
    return arr;
}

const genBlur = (n) => Array.from(new Array(n)).map(() => (1/n));

const init = () =>
    new Promise((resolve, reject) => {
        Module.onRuntimeInitialized = async _ => {
            const api = {
              create_buffer: Module.cwrap('create_buffer', 'number', ['number', 'number']),
              create_buffer_weights: Module.cwrap('create_buffer_weights', 'number', ['number']),
              destroy_buffer: Module.cwrap('destroy_buffer', '', ['number']),
              destroy_buffer_weights: Module.cwrap('destroy_buffer_weights', '', ['number']),
              get_result_pointer: Module.cwrap('get_result_pointer', 'number', []),
              get_result_size: Module.cwrap('get_result_size', 'number', []),
              convolute: Module.cwrap('convolute', '', ['number', 'number', 'number', 'number', 'number']),
              grayscale: Module.cwrap('grayscale', '', ['number', 'number', 'number']),
              invert: Module.cwrap('invert', '', ['number', 'number', 'number']),
            };
            
            const makeFilter = (fn) => image => {
                const p = api.create_buffer(image.width, image.height);
                Module.HEAP8.set(image.data, p);
                fn(p, image.width, image.height);
                const ptr = api.get_result_pointer();
                const size = api.get_result_size();
                const view = new Uint8Array(Module.HEAP8.buffer, ptr, size);
                const result = new Uint8ClampedArray(view);
                api.destroy_buffer(p);
                return new ImageData(result, image.width, image.height);
            }

            const sharpen = (image, radius = 1) => {
                if (radius < 1) return image;
                // const weights = genSharpen(radius);
                const weights = genSharpen(radius);
                const ptrImage = api.create_buffer(image.width, image.height);
                const ptrWeights = api.create_buffer_weights(weights.length);
                Module.HEAP8.set(image.data, ptrImage);
                Module.HEAP8.set(weights, ptrWeights);

                api.convolute(ptrImage, image.width, image.height, ptrWeights, weights.length);
                const ptr = api.get_result_pointer();
                const size = api.get_result_size();
                const view = new Uint8Array(Module.HEAP8.buffer, ptr, size);
                const result = new Uint8ClampedArray(view);
                api.destroy_buffer(ptrImage);
                api.destroy_buffer_weights(ptrWeights);

                console.log('Result: ', result);

                return new ImageData(result, image.width, image.height);
            }

            const blur = (image, radius = 1) => {
                if (radius < 1) return image;
                // const weights = genSharpen(radius);
                const weights = genBlur(radius);
                const ptrImage = api.create_buffer(image.width, image.height);
                const ptrWeights = api.create_buffer_weights(weights.length);
                Module.HEAP8.set(image.data, ptrImage);
                Module.HEAP8.set(weights, ptrWeights);

                api.convolute(ptrImage, image.width, image.height, ptrWeights, weights.length);
                const ptr = api.get_result_pointer();
                const size = api.get_result_size();
                const view = new Uint8Array(Module.HEAP8.buffer, ptr, size);
                const result = new Uint8ClampedArray(view);
                api.destroy_buffer(ptrImage);
                api.destroy_buffer_weights(ptrWeights);

                console.log('Result: ', result);

                return new ImageData(result, image.width, image.height);
            }

            resolve({
                grayscale: makeFilter(api.grayscale),
                invert: makeFilter(api.invert),
                sharpen,
                blur,
            });
        };
    })


const grayscaleNative = (pixels) => {
    const d = pixels.data;
    for (let i = 0; i < d.length; i+= 4) {
        const r = d[i];
        const g = d[i+1];
        const b = d[i+2];
    
        // Demphasize red and blue
        const v = (0.2126 * r) + (0.7152*g) + (0.0722*b);
        d[i] = d[i+1] = d[i+2] = v;
    }
    return pixels;
}

const main = async () => {
    const api = await init();

    const $main = document.getElementById('main');
    const $second = document.getElementById('second');
    const $third = document.getElementById('third');
    const image = getPixels($main);

    // C WASM
    const newData = api.sharpen(image, 1);
    const src = data2src(newData);
    $second.src = src;

    // Native
    const nativeData = grayscaleNative(image);
    const nativeSrc = data2src(nativeData);
    $third.src = nativeSrc;

}

main();
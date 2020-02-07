#include <emscripten.h>
#include <stdlib.h>
#include <math.h>

int result[2];

EMSCRIPTEN_KEEPALIVE
unsigned char* create_buffer(int width, int height) {
  return malloc(width * height * 4 * sizeof(unsigned char));
}

EMSCRIPTEN_KEEPALIVE
double* create_buffer_weights(int len) {
  return malloc(len * sizeof(double));
}

EMSCRIPTEN_KEEPALIVE
void destroy_buffer(unsigned char *p) {
    free(p);
}

EMSCRIPTEN_KEEPALIVE
void destroy_buffer_weights(double *p) {
  free(p);
}

EMSCRIPTEN_KEEPALIVE
int get_result_pointer() {
  return result[0];
}

EMSCRIPTEN_KEEPALIVE
int get_result_size() {
  return result[1];
}

EMSCRIPTEN_KEEPALIVE
void grayscale(unsigned char *img_in, int width, int height) {
  size_t size = width * height * 4;
  unsigned char *img_out = malloc(size * sizeof(unsigned char));

  for (int i = 0; i < size; i += 4) {
    unsigned char r = img_in[i];
    unsigned char g = img_in[i+1];
    unsigned char b = img_in[i+2];
    float v = (0.2126*r) + (0.7152*g) + (0.2722*b);
    img_out[i] = v;
    img_out[i+1] = v;
    img_out[i+2] = v;
    img_out[i+3] = img_in[i+3];
  }

  result[0] = (int)img_out;
  result[1] = size;  
}

EMSCRIPTEN_KEEPALIVE
void invert(unsigned char *img_in, int width, int height) {
  size_t size = width * height * 4;
  unsigned char *img_out = malloc(size * sizeof(unsigned char));

  for (int i = 0; i < size; i += 4) {
    unsigned char r = img_in[i];
    unsigned char g = img_in[i+1];
    unsigned char b = img_in[i+2];
    img_out[i] = r;
    img_out[i+1] = r;
    img_out[i+2] = r;
    img_out[i+3] = img_in[i+3];
  }

  result[0] = (int)img_out;
  result[1] = size;
}

EMSCRIPTEN_KEEPALIVE
void convolute(unsigned char *img_in, int width, int height, double *weights, int weight_len) {
  int side = (int) sqrt(weight_len);
  int halfSide = (int) floor(side / 2);
  int size = width * height * 4;
  unsigned char *img_out = malloc(size * sizeof(unsigned char));

  int alpha = 0;

  for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
      int sy = y;
      int sx = x;
      int offset = (y * width + x) * 4;

      // calculate the weighed sum of the source image pixels that
      // fall under the convolution matrix      
      double r = 0;
      double g = 0;
      double b = 0;
      double a = 0;
      for (int cy = 0; cy < side; cy++) {
        for (int cx = 0; cx < side; cx++) {
          int scy = sy + cy - halfSide;
          int scx = sx + cx - halfSide;
          if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
            int srcOffset = (scy * width + scx) * 4;
            double wt = 1;
            r += img_in[offset] * wt;
            g += img_in[offset+1] * wt;
            b += img_in[offset+2] * wt;
            a += img_in[offset+3] * wt;
          }
        }
      }

      r = (int)(r) & 255;
      g = (int)(g) & 255;
      b = (int)(b) & 255;
      a = (int)(a) & 255;

      img_out[offset] = r;
      img_out[offset+1] = g;
      img_out[offset+2] = b;
      img_out[offset+3] = a + alpha * (255 - a);
    }
  }

  result[0] = (int)img_out;
  result[1] = size;
}
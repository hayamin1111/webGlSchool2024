attribute vec3 position;
attribute vec4 color;
varying vec4 vColor;

void main() {
  vColor = color;

  gl_Position = vec4(position, 1.0);
}

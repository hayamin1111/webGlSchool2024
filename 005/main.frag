precision mediump float;

uniform float time;

varying vec4 vColor;

void main() {
  float a = vColor.a * abs(sin(time));

  gl_FragColor = vec4(vColor.rgb, a);
}

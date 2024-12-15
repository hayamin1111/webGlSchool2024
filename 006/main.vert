
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;

varying vec3 vNormal;
varying vec4 vColor;

uniform mat4 mvpMatrix;

void main() {
  //用意した頂点属性を使ってvaryingを初期化
  vNormal = normal;
  vColor = color;

  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(position, 1.0);
}


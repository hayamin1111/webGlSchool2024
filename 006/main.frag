precision mediump float;

varying vec3 vNormal;
varying vec4 vColor;

uniform mat4 normalMatrix;

const vec3 light = vec3(1.0, 1.0, 1.0);

void main() {
  // 法線をまず行列で変換する
  vec3 n = (normalMatrix * vec4(vNormal, 0.0)).xyz;

  // 変換した法線とライトベクトルで内積を取る
  float d = dot(normalize(n), normalize(light));
  
  // 内積の結果を頂点カラーの RGB 成分に乗算する
  gl_FragColor = vec4(vColor.rgb * d, vColor.a);
}

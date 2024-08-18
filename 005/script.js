import { WebGLUtility } from './lib/webgl.js';

window.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  app.init();
  await app.load();

  app.setupGeometry();
  app.setupLocation();

  app.start();
}, false);


class App {
  canvas;          // WebGL で描画を行う canvas 要素
  gl;              // WebGLRenderingContext （WebGL コンテキスト）
  program;         // WebGLProgram （プログラムオブジェクト）
  position;        // 頂点の座標情報を格納する配列
  positionStride;  // 頂点の座標のストライド
  positionVBO;     // 頂点座標の VBO
  color;           // 頂点カラーの座標情報を格納する配列
  colorStride;     // 頂点カラーの座標のストライド
  colorVBO;        // 頂点カラー座標の VBO
  uniformLocation; // uniform 変数のロケーション
  startTime;       // レンダリング開始時のタイムスタンプ
  isRendering;     // レンダリングを行うかどうかのフラグ

  constructor() {
    this.render = this.render.bind(this);
  }

  init() {
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    const size = Math.min(window.innerWidth, window.innerHeight);
    this.canvas.width = size;
    this.canvas.height = size;
  }

  
  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise(async (resolve, reject) => {
      const gl = this.gl;

      if(gl == null) {
        const error = new Error('not initialized');
        reject(error);
      } else {
        const VSSource = await WebGLUtility.loadFile('./main.vert');
        const FSSource = await WebGLUtility.loadFile('./main.frag');

        const vertexShader = WebGLUtility.createShaderObject(gl, VSSource, gl.VERTEX_SHADER);

        const fragmentShader = WebGLUtility.createShaderObject(gl, FSSource, gl.FRAGMENT_SHADER);

        this.program = WebGLUtility.createProgramObject(gl, vertexShader, fragmentShader);
        resolve();
      }
    });
  }

  
  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    this.position = [
    //   0.0,  0.5,  0.0, 
    //   0.5, -0.5,  0.0, 
    //  -0.5, -0.5,  0.0, 
      0.0,  0.5, 0.0, 
      0.5,  0.1, 0.0, 
      0.0,  0.0, 0.0, 

      0.5,  0.1, 0.0, 
      0.3, -0.5, 0.0, 
      0.0,  0.0, 0.0, 

      0.3, -0.5, 0.0, 
     -0.3, -0.5, 0.0, 
      0.0,  0.0, 0.0, 

     -0.3, -0.5, 0.0, 
     -0.5,  0.1, 0.0, 
      0.0,  0.0, 0.0, 

     -0.5,  0.1, 0.0, 
      0.0,  0.5, 0.0, 
      0.0,  0.0, 0.0, 

    ];

    this.positionStride = 3;
    //VBOを生成
    this.positionVBO = WebGLUtility.createVBO(this.gl, this.position);

    this.color = [
      1.0, 0.0, 0.0, 1.0,
      1.0, 0.0, 0.0, 1.0,
      1.0, 1.0, 1.0, 1.0,

      0.0, 1.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      1.0, 1.0, 1.0, 1.0,

      0.0, 0.0, 1.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0,

      1.0, 1.0, 0.0, 1.0,
      1.0, 1.0, 0.0, 1.0,
      1.0, 1.0, 1.0, 1.0,

      0.0, 1.0, 1.0, 1.0,
      0.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0,

      // 1.0, 0.0, 0.0, 1.0,
      // 0.0, 1.0, 0.0, 1.0,
      // 0.0, 0.0, 1.0, 1.0,

      // 1.0, 0.0, 0.0, 1.0,
      // 0.0, 1.0, 0.0, 1.0,
      // 0.0, 0.0, 1.0, 1.0,

      // 1.0, 0.0, 0.0, 1.0,
      // 0.0, 1.0, 0.0, 1.0,
      // 0.0, 0.0, 1.0, 1.0,

      // 1.0, 0.0, 0.0, 1.0,
      // 0.0, 1.0, 0.0, 1.0,
      // 0.0, 0.0, 1.0, 1.0,

      // 1.0, 0.0, 0.0, 1.0,
      // 0.0, 1.0, 0.0, 1.0,
      // 0.0, 0.0, 1.0, 1.0,
    ];
    this.colorStride = 4;

    this.colorVBO = WebGLUtility.createVBO(this.gl, this.color);
  }

  
  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute locationの取得
    const positionAttributeLocation = gl.getAttribLocation(this.program, 'position');
    const colorAttributeLocation = gl.getAttribLocation(this.program, 'color');

    const vboArray = [this.positionVBO, this.colorVBO];
    const attributeLocationArray = [positionAttributeLocation, colorAttributeLocation];
    const strideArray = [this.positionStride, this.colorStride];

    WebGLUtility.enableBuffer(gl, vboArray, attributeLocationArray, strideArray);

    this.uniformLocation = {
      time: gl.getUniformLocation(this.program, 'time'),
    };
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.clearColor(0.3, 0.3, 0.3, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * 描画を開始する
   */
  start() {
    this.startTime = Date.now();
    this.isRendering = true;
    this.render();
  }
  
  /**
   * 描画を停止する
   */
  stop() {
    this.isRendering = false;
  }
  
  /**
   * レンダリングを行う
   */
  render() {
    const gl = this.gl;
    
    if (this.isRendering === true) {
      requestAnimationFrame(this.render);
    }

    this.setupRendering();

    const nowTime = (Date.now() - this.startTime) * 0.001;

    gl.useProgram(this.program);

    gl.uniform1f(this.uniformLocation.time, nowTime);

    gl.drawArrays(gl.TRIANGLES, 0, this.position.length / this.positionStride);
  }
}

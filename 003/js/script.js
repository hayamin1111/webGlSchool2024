import * as THREE from '../lib/three.module.js';
import { OBJLoader } from '../lib/OBJLoader.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  // 初期化処理をコンストラクタから分離
  app.init();
  app.render();
}, false);

class ThreeApp {
  /**
   * 月に掛けるスケール
   */
  static UFO_SCALE = 0.004;
  /**
   * 月と地球の間の距離
   */
  static UFO_DISTANCE = 1.6;
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 100.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x16323E,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };

  wrapper;          // canvas の親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  clock;            // 時間管理用 
  sphereGeometry;   // ジオメトリ
  moon;            // 月
  moonMaterial;    // 月用マテリアル
  moonTexture;     // 月用テクスチャ
  ufo;             // UFO
  ufoMaterial;     // UFO用マテリアル
  ufoObject;       // UFOオブジェクト

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener('keydown', (keyEvent) => {
      switch (keyEvent.key) {
        case ' ':
          this.isDown = true;
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
    }, false);

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  
  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      // 月用画像の読み込みとテクスチャ生成
      const moonPath = './img/moon.png';
      const ufoPath = './img/ufo.obj';
      const imgLoader = new THREE.TextureLoader();
      const objLoader = new OBJLoader();
      // 月用
      imgLoader.load(moonPath, (moonTexture) => {
        this.moonTexture = moonTexture;
        // UFO用
        objLoader.load(ufoPath, (ufoObject) => {
          this.ufoObject = ufoObject;
          resolve();
        });
      });
    });
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    //グループ
    this.ufoGroup = new THREE.Group();
    this.scene.add(this.ufoGroup);

    // 月のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
    // 月のマテリアルとメッシュ
    this.moonMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.moonMaterial.map = this.moonTexture;
    this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
    this.scene.add(this.moon);

    //シーンにUFOを追加
    this.ufoObject.scale.set(ThreeApp.UFO_SCALE, ThreeApp.UFO_SCALE, ThreeApp.UFO_SCALE);
    this.ufoObject.position.set(ThreeApp.UFO_DISTANCE, 0.0, 0.0);
    this.ufoGroup.add(this.ufoObject);
    this.ufoObject.rotation.set(
      0.0, 
      this.degToRad(50), 
      this.degToRad(-90)
    );

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // Clock オブジェクトの生成 
    this.clock = new THREE.Clock();
  }

  /**
   * 度数法を弧度法に変換するメソッド
   * @param {number} deg 度数法での角度
   * @return {number} ラジアンを返す
   */
  degToRad(deg) {
    return Math.PI * 2 / 360 * deg;
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    const time = this.clock.getElapsedTime();
    
    // 月の回転
    this.moon.rotation.z = time * 0.1;
    this.moon.rotation.x = time * 0.1;

    // UFOの動き
    const sin = Math.sin(time);
    const cos = Math.cos(time);
    this.ufoGroup.position.set(
      cos * ThreeApp.UFO_DISTANCE,
      sin * ThreeApp.UFO_DISTANCE,
      sin * ThreeApp.UFO_DISTANCE,
    );
    this.ufoGroup.lookAt(0, 0, 0);
    
    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}

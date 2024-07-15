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
   * UFOに掛けるスケール
   */
  static UFO_SCALE = 0.002;
  /**
   * 月とUFOの間の距離
   */
  static UFO_DISTANCE = 2;
  /**
   * 月と敵の間の距離
   */
  static ENEMY_DISTANCE = 2.4;
  /**
   * 敵の移動速度
   */
  static ENEMY_SPEED = 0.03;
  /**
   * 敵の曲がる力
   */
  static ENEMY_TURN_SCALE = 0.1;
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
   * 月マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  /**
   * 敵マテリアル定義のための定数
   */
  static MATERIAL_PARAM_ENEMY = {
    color: 0xFFFA77,
  };

  wrapper;          // canvas の親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  clock;            // 時間管理用 
  sphereGeometry;   // ジオメトリ
  moon;            // 月
  moonMaterial;    // 月用マテリアル
  moonTexture;     // 月用テクスチャ
  ufo;             // UFO
  ufoMaterial;     // UFO用マテリアル
  ufoObject;       // UFOオブジェクト
  enemy;          //敵
  enemyGeometry;  //敵ジオメトリ
  enemyMaterial;  //敵マテリアル
  enemyDirection;  //敵進行方向
  button;         //追撃ボタン
  isFire;         //追撃用の真偽値


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

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);

    //追撃ボタンの初期化
    this.button = document.getElementById('js-fire');
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
    // const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setClearColor(0x000000, 0);
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

    // 球のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(1.8, 32, 32);
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

    // 敵のマテリアルとメッシュ
    this.enemyMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM_ENEMY);
    this.enemy = new THREE.Mesh(this.sphereGeometry, this.enemyMaterial);
    this.scene.add(this.enemy);
    this.enemy.position.set(ThreeApp.ENEMY_DISTANCE, ThreeApp.ENEMY_DISTANCE, ThreeApp.ENEMY_DISTANCE);
    this.enemy.scale.setScalar(0.03);
    // 進行方向の初期化
    this.enemyDirection = new THREE.Vector3(0.0, 1.0, 0.0).normalize();

    // コントロール
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    // const axesBarLength = 5.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // Clock オブジェクトの生成 
    this.clock = new THREE.Clock();

    
    /**
     * 敵に追撃するイベント
     */
    this.button.addEventListener('click', () => {
      this.isFire = true;
    }, false);
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
    // this.controls.update();

    const time = this.clock.getElapsedTime();
    const sin = Math.sin(time);
    const cos = Math.cos(time);
    
    // 月の回転
    this.moon.rotation.z = time * 0.1;
    this.moon.rotation.x = time * 0.1;

    // UFOの動き
    this.ufoObject.rotation.x = time * 1.2;
    this.ufoGroup.position.set(
      cos * ThreeApp.UFO_DISTANCE + (Math.sin(time * 1.4)),
      sin * ThreeApp.UFO_DISTANCE + (Math.sin(time * 1.2)),
      sin * ThreeApp.UFO_DISTANCE + (Math.sin(time * 1.3)),
    );
    this.ufoGroup.lookAt(0, 0, 0);

    //敵がUFOを追尾する
    if(this.isFire) {
      //敵からUFOへの向きのベクトル
      const subVector = new THREE.Vector3().subVectors(this.ufoGroup.position, this.enemy.position);
      subVector.normalize();
      subVector.multiplyScalar(ThreeApp.ENEMY_TURN_SCALE);
      this.enemyDirection.add(subVector);
      this.enemyDirection.normalize();
      const direction = this.enemyDirection.clone();
      this.enemy.position.add(direction.multiplyScalar(ThreeApp.ENEMY_SPEED));
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}

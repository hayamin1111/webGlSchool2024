import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 30.0,
    position: new THREE.Vector3(0.0, 2.0, 30.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x000000,     
    width: window.innerWidth,   
    height: window.innerHeight, 
  };
  /**
   * ポイントライト定義のための定数
   */
  static POINT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 10.0,
    radius: 7,
    centerOffset: 15,
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, 
    intensity: 0.01, 
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x00fcff, 
    specular: 0xffffff, 
    shininess: 1, 
  };

  renderer;         
  scene;            
  camera;           
  pointLight; 
  ambientLight;     
  material;        
  boxGeometry;    
  boxArray;       
  controls;         
  // axesHelper;       
  // pointLightHelper;
  isDown;           

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

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

    //ポイントライト（中央を移動する）
    this.pointLight = new THREE.PointLight(
      ThreeApp.POINT_LIGHT_PARAM.color,
      ThreeApp.POINT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.pointLight);

    //ポイントライトヘルパー
    // const sphereSize = 1;
    // const pointLightHelper = new THREE.PointLightHelper( this.pointLight, sphereSize );
    // this.scene.add( pointLightHelper );

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // boxの1列の数
    const boxCount = 30;
    //box間の余白
    const spacer = 1.2;
    //box群の半分の長さ（中心に移動させるため）
    const offset = boxCount * spacer / 2;

    this.boxGerometry = new THREE.BoxGeometry(1, 1, 1);
    this. boxArray = [];
    //正方形にboxを並べる
    for(let i = 0; i < boxCount; i ++) {
      for(let j = 0; j < boxCount; j ++) {
        //下段のbox群
        const boxLower = new THREE.Mesh(this.boxGerometry, this.material);
        boxLower.position.x = i * spacer - offset;
        boxLower.position.z = j * spacer;
        this.scene.add(boxLower);
        this.boxArray.push(boxLower);

        //上段のbox群
        const boxUpper = new THREE.Mesh(this.boxGerometry, this.material);
        boxUpper.position.x = i * spacer - offset;
        boxUpper.position.y = 7;
        boxUpper.position.z = j * spacer;
        this.scene.add(boxUpper);
        this.boxArray.push(boxUpper);
      }  
    }

    // 軸ヘルパー
    // const axesBarLength = 5.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this のバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

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

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);

    //時間経過で増加する値
    this.tick = 0;
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    //boxのアニメーション
    if (this.isDown === true) {
      this.boxArray.forEach((box) => {
        box.rotation.y += 0.01;
      });
    }

    //ポイントライトの移動
    this.tick += 0.01;
    //円周上を移動させる
    this.pointLight.position.x = ThreeApp.POINT_LIGHT_PARAM.radius * Math.cos(this.tick);
    this.pointLight.position.z = ThreeApp.POINT_LIGHT_PARAM.radius * Math.sin(this.tick) + ThreeApp.POINT_LIGHT_PARAM.centerOffset;
    this.pointLight.position.y = 4; 


    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}


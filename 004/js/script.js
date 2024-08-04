import * as THREE from '../lib/three.module.js';
import {OrbitControls} from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  app.init();
  app.render();
}, false);

class ThreeApp {
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 20.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };

  static RENDERER_PARAM = {
    clearColor: 0xebebeb,
    width: window.innerWidth,
    height: window.innerHeight,
  };

  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  }

  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1,
  }

  static MATERIAL_PARAM = {
    color: 0xffffff,
  }

  static GEOMETRY_PARAM = {
    radiusTop : 1.0, 
    radiusBottom : 1.0, 
    height : 7.0, 
    radialSegments: 6.0
  }
  
  static INTERSECTION_MATERIAL_PARAM = {
    color: 0x00ff00,
    scale: 2,
  }

  //クラスフィールドの宣言
  wrapper;          // canvasの親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  scale;            // 拡大サイズ
  // hitMaterial;      // レイが交差した際のマテリアル 
  omikujiGeometry;  // おみくじジオメトリ
  omikujiArray;     // おみくじメッシュの配列
  texture;          // テクスチャ
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  group;            // グループ
  raycaster;        // レイキャスター
  tick;             // 時間経過

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper -canvasをappendする
   */
  constructor(wrapper) {
    this.wrapper = wrapper;

    this.render = this.render.bind(this);

    //Raycasterのインスタンス生成
    this.raycaster = new THREE.Raycaster();

    window.addEventListener('click', (mouseEvent) => { 
      //スクリーン空間でのポインタの位置をレイキャスター用に正規化
      //1.ポインタの位置をmaxになる値（windowの幅・高さ）で割る -> 0~1
      //2.2倍して1引く -> -1~1（正規化）
      const x = mouseEvent.clientX / window.innerWidth * 2.0 - 1.0;
      const y = mouseEvent.clientY / window.innerHeight * 2.0 - 1.0;

      //スクリーン空間は上下反転なので-y座標を合わせる
      const mouse = new THREE.Vector2(x, -y);
      
      //レイキャスターに正規化したポインタの座標とカメラを指定する（ポインタの位置からまっすぐ伸びる光線ベクトルを生成）
      this.raycaster.setFromCamera(mouse, this.camera);

      //全てのMeshをレイキャストする（intersects光線とぶつかったmeshが配列として格納される）
      const intersects = this.raycaster.intersectObjects(this.omikujiArray);

      //レイが交差しなかった場合のために、マテリアルを通常の状態にリセットしておく
      //= レイが交差しなくなったら、元の状態に戻す
      this.omikujiArray.forEach(mesh => {
        mesh.scale.set(
          ThreeApp.GEOMETRY_PARAM.scale,
          ThreeApp.GEOMETRY_PARAM.scale,
          ThreeApp.GEOMETRY_PARAM.scale
        );
      });

      if(intersects.length > 0) {
        //objectプロパティは、交差したオブジェクト（この場合はメッシュ）を指す
        //object（mesh）のscaleを変更
        intersects[0].object.scale.set(
          ThreeApp.INTERSECTION_MATERIAL_PARAM.scale,
          ThreeApp.INTERSECTION_MATERIAL_PARAM.scale,
          ThreeApp.INTERSECTION_MATERIAL_PARAM.scale
        );
      }

      console.log(intersects[0]);
    }, false);

    //リサイズ処理
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  
  /**
   * 初期化処理
   */
  init() {
    //レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);

    //シーン
    this.scene = new THREE.Scene();

    //カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    //copyを使っているのは、新しくインスタンスを生成することで、大元のCAMERA_PARAMが意図せず変更されることを防ぐ（staticメソッドはクラス全体で共有するため、外から変更するものではない）
    //this.camera.position = ThreeApp.CAMERA_PARAM.position;としてしまうと、this.camera.position.set(1.0, 2.0, 3.0);とした時にCAMERA_PARAMの値も変わってしまう。
    //staticメソッドを値に代入する際には、copyを使用するとよい
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    //ディレクショナルライト
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity,
    )
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    //アンビエントライト
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    )
    this.scene.add(this.ambientLight);

    //マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.material.map = this.texture;
    // 交差時のマテリアルを設定
    // this.hitMaterial = new THREE.MeshPhongMaterial(ThreeApp.INTERSECTION_MATERIAL_PARAM.scale);
    // this.hitMaterial.map = this.texture;

    //メッシュ
    const omikujiCount = 5;
    const gap = 3;
    const totalWidth = (omikujiCount - 1) * gap; // 配置範囲の幅を計算
    const startPosition = -totalWidth / 2; // 幅の半分を引いた位置からスタート（中央に位置させるため）
    this.omikujiGeometry = new THREE.CylinderGeometry(
      ThreeApp.GEOMETRY_PARAM.radiusTop,
      ThreeApp.GEOMETRY_PARAM.radiusBottom,
      ThreeApp.GEOMETRY_PARAM.height,
      ThreeApp.GEOMETRY_PARAM.radialSegments,
    ); 
    this.omikujiArray = [];
    for(let i = 0; i < omikujiCount; i++) {
      const omikuji = new THREE.Mesh(this.omikujiGeometry, this.material);
      omikuji.position.x = startPosition + i * gap;
      this.omikujiArray.push(omikuji);
      this.scene.add(omikuji);
    }
    
    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.tick = 0;
  }
  
  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      const imagePath = './img/mokume.jpg';
      const loader = new THREE.TextureLoader();
      loader.load(imagePath, (texture) => {
        this.texture = texture;
        resolve();
      });
    });
  }
  
  /**
   * 描画処理
   */
  render() {
    requestAnimationFrame(this.render);

    this.controls.update();

    this.renderer.render(this.scene, this.camera);

    this.tick++;
    this.omikujiArray.forEach(omikuji => {
      omikuji.rotation.y = this.tick * 0.005;
    })
  }

}

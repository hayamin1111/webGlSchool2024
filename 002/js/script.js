import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  /**
   *  カメラ定義
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 20.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };

  /**
   * レンダラー定義
   */
  static RENDERER_PARAM = {
    clearColor: 0x666666,
    width: window.innerWidth,
    height: window.innerHeight,
  };

  /**
   * 並行光源定義
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };

  /**
   * アンビエントライト定義
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
  };

  /**
   * マテリアル定義
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
    side: THREE.DoubleSide, // 描画する面（バックフェイスカリングの設定）
  };

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  cylinderGeometry;    // トーラスジオメトリ
  torusArray;       // トーラスメッシュの配列
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  group;            // グループ
  fansNum = 6;
  // upButton;
  // downButton;

  /**
   *  コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvasをappend
   */
  constructor(wrapper) {
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    //シーン
    this.scene = new THREE.Scene();

    //カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    //⭐️要確認：copy
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    //並行光源
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    //⭐️要確認：copy
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    //環境光
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    //グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);

    //首用のジオメトリ、メッシュ
    this.cylinderGeometry = new THREE.CylinderGeometry( 0.2, 0.2, 6, 16 );
    this.cylinder = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.cylinderMesh = new THREE.Mesh(this.cylinderGeometry, this.cylinder);
    this.cylinderMesh.position.y = -2.8;
    this.cylinderMesh.position.z = -0.7;
    this.scene.add(this.cylinderMesh);

    //首付け根用のジオメトリ、メッシュ
    this.cylinderGeometry02 = new THREE.CylinderGeometry( 0.6, 0.6, 1.6, 16 );
    this.cylinderMesh02 = new THREE.Mesh(this.cylinderGeometry02, this.cylinder);
    this.cylinderMesh02.position.y = 0;
    this.cylinderMesh02.position.z = -0.3;
    this.cylinderMesh02.rotation.x = degToRad(90);
    this.scene.add(this.cylinderMesh02);

    //土台用のジオメトリ、メッシュ
    this.cylinderGeometry03 = new THREE.CylinderGeometry( 2.4, 2.4, 0.4, 32 );
    this.cylinderMesh03 = new THREE.Mesh(this.cylinderGeometry03, this.cylinder);
    this.cylinderMesh03.position.y = -6;
    this.cylinderMesh03.position.z = -0.7;
    this.scene.add(this.cylinderMesh03);

    
    //羽用のジオメトリ、メッシュ
    const x = 0, y = 0;
    const radius = 3;
    // this.fansNum = 5;
    const fansGap = 12;
    const fanStartDegArray = [];
    const fanEndDegArray = [];

    /**
     * 度数法を弧度法に変換する関数
     * @param {number} deg 度数法での角度
     * @return {number} ラジアンを返す
     */
    function degToRad(deg) {
      return Math.PI * 2 / 360 * deg;
    }

    /**
     * 羽の数から、それぞれの羽の円弧の開始点・終了点を生成する関数
     * @param {number} fansNum 羽の数
     * @param {number} gap 羽と羽の間
     */
    function makeFansDeg(fansNum, gap) {
      const fanDeg = 360 / fansNum; //羽1つあたりの角度
      const fanDegFirst = fanDeg - gap; //羽1つ目の角度
      for(let i = 0; i < 360; i+=fanDeg) {
        fanStartDegArray.push(i);
      }
      for(let i = fanDegFirst; i < 360; i+=fanDeg) {
        fanEndDegArray.push(i);
      }
    }
    makeFansDeg(this.fansNum, fansGap); //⭐️ここのthis.fansNumをrender内で更新すればよさそう

    for(let i = 0; i < this.fansNum; i++) {
      const startRad = degToRad(fanStartDegArray[i]);
      const endRad = degToRad(fanEndDegArray[i]);  

      const fanShape = new THREE.Shape();
      //羽ジオメトリの始点
      fanShape.moveTo(x, y);
      // 円周上の1点に向かって直線を描く
      fanShape.lineTo(x + radius * Math.cos(startRad), y + radius * Math.sin(startRad));
      // 羽の弧を描く
      const curveSegments = 20; // 曲線の滑らかさを決めるセグメント数
      const angleStep = (endRad - startRad) / curveSegments;
      for (let i = 1; i <= curveSegments; i++) {
        const angle = startRad + i * angleStep;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        // 始点へ直線をつなげる
        fanShape.lineTo(x, y);
      }

      const geometry = new THREE.ShapeGeometry(fanShape);
      const material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
    }
    
    //羽の増減
    const upButton = document.getElementById('js-increaseFans');
    upButton.addEventListener('click', (e) => {
      if(this.fansNum < 16) {
        this.fansNum++;
      } else {
        return;
      }
      console.log(this.fansNum);
    }, false);

    const downButton = document.getElementById('js-reduceFans');
    downButton.addEventListener('click', (e) => {
      if(this.fansNum > 3) {
        this.fansNum--;
      } else {
        return;
      }
      console.log(this.fansNum);
    }, false);


    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    //コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    //バインド
    this.render = this.render.bind(this);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  // /**
  //  * 羽の数を増やすメソッド
  //  * @return {number} 羽の数を返す
  //  */
  // increaseFans() {
  //   this.upButton = document.getElementById('js-increaseFans');
  //   upButton.addEventListener('click', (e) => {
  //     if(this.fansNum < 16) {
  //       this.fansNum++;
  //     } else {
  //       return;
  //     }
  //     console.log(this.fansNum);
  //     return this.fansNum;
  //   }, false);
  // }

  // /**
  //  * 羽の数を減らすメソッド
  //  * @return {number} 羽の数を返す
  //  */
  // reduceFans() {
  //   this.downButton = document.getElementById('js-reduceFans');
  //   downButton.addEventListener('click', (e) => {
  //     if(this.fansNum > 3) {
  //       this.fansNum--;
  //     } else {
  //       return;
  //   }
  //   console.log(this.fansNum);
  //   return this.fansNum;
  //   }, false);
  // }

  /**
   * 描画処理
   */
  render() {
    requestAnimationFrame(this.render);
    this.controls.update();

    //fansNumの値を変更したい
    // this.fansNum = this.fansNum;

    if(this.isDown === true) {
      this.group.rotation.y += 0.05;
    }

    this.renderer.render(this.scene, this.camera);
  }

}



// import * as THREE from '../lib/three.module.js';
// import { OrbitControls } from '../lib/OrbitControls.js';

// window.addEventListener('DOMContentLoaded', () => {
//   const wrapper = document.getElementById('webgl');
//   const app = new ThreeApp(wrapper);
//   app.render();
// }, false);

// class ThreeApp {
//   /**
//    *  カメラ定義
//    */
//   static CAMERA_PARAM = {
//     fovy: 60,
//     aspect: window.innerWidth / window.innerHeight,
//     near: 0.1,
//     far: 20.0,
//     position: new THREE.Vector3(0.0, 2.0, 10.0),
//     lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
//   };

//   /**
//    * レンダラー定義
//    */
//   static RENDERER_PARAM = {
//     clearColor: 0x666666,
//     width: window.innerWidth,
//     height: window.innerHeight,
//   };

//   /**
//    * 並行光源定義
//    */
//   static DIRECTIONAL_LIGHT_PARAM = {
//     color: 0xffffff,
//     intensity: 1.0,
//     position: new THREE.Vector3(1.0, 1.0, 1.0),
//   };

//   /**
//    * アンビエントライト定義
//    */
//   static AMBIENT_LIGHT_PARAM = {
//     color: 0xffffff,
//     intensity: 1.0,
//   };

//   /**
//    * マテリアル定義
//    */
//   static MATERIAL_PARAM = {
//     color: 0xffffff,
//     side: THREE.DoubleSide, // 描画する面（バックフェイスカリングの設定）
//   };

//   renderer;         // レンダラ
//   scene;            // シーン
//   camera;           // カメラ
//   directionalLight; // 平行光源（ディレクショナルライト）
//   ambientLight;     // 環境光（アンビエントライト）
//   material;         // マテリアル
//   torusGeometry;    // トーラスジオメトリ
//   torusArray;       // トーラスメッシュの配列
//   controls;         // オービットコントロール
//   axesHelper;       // 軸ヘルパー
//   isDown;           // キーの押下状態用フラグ
//   group;            // グループ
//   fansNum = 5;

//   /**
//    *  コンストラクタ
//    * @constructor
//    * @param {HTMLElement} wrapper - canvasをappend
//    */
//   constructor(wrapper) {
//     const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
//     this.renderer = new THREE.WebGLRenderer();
//     this.renderer.setClearColor(color);
//     this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
//     wrapper.appendChild(this.renderer.domElement);

//     //シーン
//     this.scene = new THREE.Scene();

//     //カメラ
//     this.camera = new THREE.PerspectiveCamera(
//       ThreeApp.CAMERA_PARAM.fovy,
//       ThreeApp.CAMERA_PARAM.aspect,
//       ThreeApp.CAMERA_PARAM.near,
//       ThreeApp.CAMERA_PARAM.far,
//     );
//     //⭐️要確認：copy
//     this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
//     this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

//     //並行光源
//     this.directionalLight = new THREE.DirectionalLight(
//       ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
//       ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
//     );
//     //⭐️要確認：copy
//     this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
//     this.scene.add(this.directionalLight);

//     //環境光
//     this.ambientLight = new THREE.AmbientLight(
//       ThreeApp.AMBIENT_LIGHT_PARAM.color,
//       ThreeApp.AMBIENT_LIGHT_PARAM.intensity
//     );
//     this.scene.add(this.ambientLight);

//     //グループ
//     this.group = new THREE.Group();
//     this.scene.add(this.group);
    
//     //ジオメトリ、メッシュ
//     const x = 0, y = 0;
//     const radius = 3;
//     // this.fansNum = 5;
//     const fansGap = 12;
//     const fanStartDegArray = [];
//     const fanEndDegArray = [];

//     /**
//      * 度数法を弧度法に変換する関数
//      * @param {number} deg 度数法での角度
//      * @return {number} ラジアンを返す
//      */
//     function degToRad(deg) {
//       return Math.PI * 2 / 360 * deg;
//     }

//     /**
//      * 羽の数から、それぞれの羽の円弧の開始点・終了点を生成する関数
//      * @param {number} fansNum 羽の数
//      * @param {number} gap 羽と羽の間
//      */
//     function makeFansDeg(fansNum, gap) {
//       const fanDeg = 360 / fansNum; //羽1つあたりの角度
//       const fanDegFirst = fanDeg - gap; //羽1つ目の角度
//       for(let i = 0; i < 360; i+=fanDeg) {
//         fanStartDegArray.push(i);
//       }
//       for(let i = fanDegFirst; i < 360; i+=fanDeg) {
//         fanEndDegArray.push(i);
//       }
//     }
//     makeFansDeg(this.fansNum, fansGap); //⭐️ここのthis.fansNumをrender内で更新すればよさそう

//     for(let i = 0; i < this.fansNum; i++) {
//       const startRad = degToRad(fanStartDegArray[i]);
//       const endRad = degToRad(fanEndDegArray[i]);  

//       const fanShape = new THREE.Shape();
//       //羽ジオメトリの始点
//       fanShape.moveTo(x, y);
//       // 円周上の1点に向かって直線を描く
//       fanShape.lineTo(x + radius * Math.cos(startRad), y + radius * Math.sin(startRad));
//       // 羽の弧を描く
//       const curveSegments = 20; // 曲線の滑らかさを決めるセグメント数
//       const angleStep = (endRad - startRad) / curveSegments;
//       for (let i = 1; i <= curveSegments; i++) {
//         const angle = startRad + i * angleStep;
//         const x = radius * Math.cos(angle);
//         const y = radius * Math.sin(angle);
//         // 始点へ直線をつなげる
//         fanShape.lineTo(x, y);
//       }

//       const geometry = new THREE.ShapeGeometry(fanShape);
//       const material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
//       const mesh = new THREE.Mesh(geometry, material);
//       this.scene.add(mesh);
//     }
    
//     // 軸ヘルパー
//     const axesBarLength = 5.0;
//     this.axesHelper = new THREE.AxesHelper(axesBarLength);
//     this.scene.add(this.axesHelper);

//     //コントロール
//     this.controls = new OrbitControls(this.camera, this.renderer.domElement);

//     //バインド
//     this.render = this.render.bind(this);

//     //羽の枚数を変える間ん数
//     const upButton = document.getElementById('js-increaseFans');
//     const downButton = document.getElementById('js-reduceFans');
//     upButton.addEventListener('click', (e) => {
//       console.log(this.fansNum)
//       this.fansNum++;
//       if(this.fansNum > 16) {
//         return;
//       }
//     }, false);
//     downButton.addEventListener('click', (e) => {
//       console.log(this.fansNum)
//       this.fansNum--;
//       if(this.fansNum < 2) {
//         return;
//       }
//     }, false);

//     window.addEventListener('resize', () => {
//       this.renderer.setSize(window.innerWidth, window.innerHeight);
//       this.camera.aspect = window.innerWidth / window.innerHeight;
//       this.camera.updateProjectionMatrix();
//     }, false);
//   }

//   /**
//    * 描画処理
//    */
//   render() {
//     requestAnimationFrame(this.render);
//     this.controls.update();



//     if(this.isDown === true) {
//       this.group.rotation.y += 0.05;
//     }

//     this.renderer.render(this.scene, this.camera);
//   }

// }

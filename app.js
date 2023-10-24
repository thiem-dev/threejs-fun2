var noise = new SimplexNoise();

var init = function (){
  

var audio = document.getElementById("audio");
var file = document.getElementById("thefile");
var vertexShaderM = document.getElementById('vertexShader').textContent;
var fragmentShaderM = document.getElementById('fragmentShader').textContent;

//   audio.load();
//   play();

  audio.volume = 0.5;
  var fileLabel = document.querySelector("label.file");
  
  document.onload = function(e){
    console.log(e);
    audio.play();
    play();
  }

  file.onchange = function(){
    fileLabel.classList.add('normal');
    audio.classList.add('active');
    var files = this.files;
    
    audio.src = URL.createObjectURL(files[0]);
    audio.load();
    audio.play();
    play();
  }
  
    function play() {


        //audio configurations
        var context = new AudioContext();
        var src = context.createMediaElementSource(audio);
        var analyser = context.createAnalyser();
        src.connect(analyser);
        analyser.connect(context.destination);
        analyser.fftSize = 512;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);



          //freq translated to vertex movement
            const uniforms = {
                u_time: {
                type: "f",
                value: 1.0,
                },
                u_amplitude: {
                type: "f",
                value: 3.0,
                },
                u_data_arr: {
                type: "float[64]",
                value: dataArray,
                },
                // u_black: { type: "vec3", value: new THREE.Color(0x000000) },
                // u_white: { type: "vec3", value: new THREE.Color(0xffffff) },
            };

        //Three JS basic animation
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
        const renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector("#threejs-canvas")
          });
        renderer.setSize( window.innerWidth/2, window.innerHeight/2 );
        document.body.appendChild( renderer.domElement );
    
    
        //cube geo
        const geometry = new THREE.BoxGeometry( 3, 3, 3 );
        const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true} );
        const cube = new THREE.Mesh( geometry, material );


        //plane specs
        var planeGeometry = new THREE.PlaneGeometry(800, 800, 20, 20);
        var planeMaterial = new THREE.MeshNormalMaterial({
            side: THREE.DoubleSide,
            wireframe: true
        });

        //controls all the vertices (didn't work)
        const planeCustomMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms, //dataArray, time
            vertexShader: vertexShaderM,
            fragmentShader: fragmentShaderM,
            wirefreame:true,
        })

        //ball
        var icosahedronGeometry = new THREE.IcosahedronGeometry(3, 3, 24 );
        var lambertMaterial = new THREE.MeshNormalMaterial({
            color: 0x00ff00,
            wireframe: true
        });
        var ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
        ball.position.set(0, 0, -30);


        var plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -0.5 * Math.PI;
        plane.position.set(0, 30, 0);


        var plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
        plane2.rotation.x = -0.5 * Math.PI;
        plane2.position.set(0, -30, 0);
        
    
        camera.position.z = 20;
    

        //add props to scene
        scene.add(ball)
        // scene.add( cube );
        scene.add(plane)
        scene.add(plane2)

        



        //animation loop. Contains time data(like an event parameter default)
        let dataTest;
        const animate = (time) => {
            
            // music data
            analyser.getByteFrequencyData(dataArray);
            console.log(dataArray)
            uniforms.u_time.value = time;
            uniforms.u_data_arr.value = dataArray;


            // animate waves
            var lowerHalfArray = dataArray.slice(0, (dataArray.length/2) - 1);
            var upperHalfArray = dataArray.slice((dataArray.length/2) - 1, dataArray.length - 1);

            var overallAvg = avg(dataArray);
            var lowerMax = max(lowerHalfArray);
            var lowerAvg = avg(lowerHalfArray);
            var upperMax = max(upperHalfArray);
            var upperAvg = avg(upperHalfArray);

            var lowerMaxFr = lowerMax / lowerHalfArray.length;
            var lowerAvgFr = lowerAvg / lowerHalfArray.length;
            var upperMaxFr = upperMax / upperHalfArray.length;
            var upperAvgFr = upperAvg / upperHalfArray.length;

            groundDance(plane, modulate(upperAvgFr, 0, 1, 0.5, 4));
            groundDance(plane2, modulate(lowerMaxFr, 0, 1, 0.5, 4));

            ballDance(ball, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8), modulate(upperAvgFr, 0, 1, 0, 4));


            //basic scene prop loop
            requestAnimationFrame( animate );
            renderer.render( scene, camera );

            ball.rotation.x += 0.002;
            ball.rotation.y += 0.002;



        }
        animate();
    }

}




//modulation math for objects

//vertex movement of cube
function ballDance(mesh, bassFr, treFr) {
    mesh.geometry.vertices.forEach(function (vertex, i) {
        var offset = mesh.geometry.parameters.radius;
        var amp = 7;
        var time = window.performance.now();
        vertex.normalize();
        var rf = 0.00001;
        var distance = (offset + bassFr ) + noise.noise3D(vertex.x + time *rf*7, vertex.y +  time*rf*8, vertex.z + time*rf*9) * amp * treFr;
        vertex.multiplyScalar(distance);
    });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
}


//vertex movement of Planes
function groundDance(mesh, distortionFr) {
    mesh.geometry.vertices.forEach(function (vertex, i) {
        var amp = 2;
        var time = Date.now();
        var distance = (noise.noise2D(vertex.x + time * 0.0003, vertex.y + time * 0.0001) + 0) * distortionFr * amp;
        vertex.z = distance;
    });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
}

//additional math methods for audio frequencies
function fractionate(val, minVal, maxVal) {
    return (val - minVal)/(maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
    var fr = fractionate(val, minVal, maxVal);
    var delta = outMax - outMin;
    return outMin + (fr * delta);
}

function avg(arr){
    var total = arr.reduce(function(sum, b) { return sum + b; });
    return (total / arr.length);
}

function max(arr){
    return arr.reduce(function(a, b){ return Math.max(a, b); })
}





//on load
window.onload = init();
//on load
document.body.addEventListener('touchend', function(ev) { context.resume(); });


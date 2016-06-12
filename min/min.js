// Demo by Walther
// Help w/ creating the audio tracker by Xard

var t0 = (new Date()).getTime();
var t = 1;

var gl;
var trianglePosBuffer;
var shaderProgram;
var vertexPos = [-1.0, -1.0, 1.0, -1.0, -1.0,  1.0, -1.0,  1.0, 1.0, -1.0, 1.0,  1.0 ];


var c = document.createElement('canvas');
document.body.appendChild(c);

gl = c.getContext("experimental-webgl");

function main()
{
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.enable(gl.DEPTH_TEST);
trianglePosBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, trianglePosBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPos), gl.STATIC_DRAW);
trianglePosBuffer.itemSize = 2;
trianglePosBuffer.numItems = 6;
var minifiedFrag = "precision highp float;uniform float time;uniform vec2 resolution;const int MAX_ITER=64;const float MAX_DIST=32.,EPSILON=.001;const int MAX_RECURSE=3;float vmax(vec2 v){return max(v.r,v.g);}float vmax(vec3 v){return max(max(v.r,v.g),v.b);}float vmax(vec4 v){return max(max(v.r,v.g),max(v.b,v.a));}float vmin(vec2 v){return min(v.r,v.g);}float vmin(vec3 v){return min(min(v.r,v.g),v.b);}float vmin(vec4 v){return min(min(v.r,v.g),min(v.b,v.a));}vec3 pMod3(inout vec3 p,vec3 size){vec3 c=floor((p+size*.5)/size);p=mod(p+size*.5,size)-size*.5;return c;}float pModSingle1(inout float p,float size){float halfsize=size*.5,c=floor((p+halfsize)/size);if(p>=0.)p=mod(p+halfsize,size)-halfsize;return c;}float fPlane(vec3 p,vec3 n,float distanceFromOrigin){return dot(p,n)+distanceFromOrigin;}float fSphere(vec3 p,float r){return length(p)-r;}float fBox(vec3 p,vec3 b){vec3 d=abs(p)-b;return length(max(d,vec3(0)))+vmax(min(d,vec3(0)));}void mandel(vec3 pos,out float field){const int iterations=32;float bailout=4.,power=1.+8.*sin(time*.1);vec3 z=pos;float dr=1.,r=0.;for(int i=0;i<iterations;i++){r=length(z);if(r>bailout)break;float theta=acos(z.b/r),phi=atan(z.g,z.r);dr=pow(r,power-1.)*power*dr+1.;float zr=pow(r,power);theta=theta*power;phi=phi*power;z=zr*vec3(sin(theta)*cos(phi),sin(phi)*sin(theta),cos(theta));z+=pos;}field=.5*log(r)*r/dr;}mat3 rotateX(float v){return mat3(1,0,0,0,cos(v),-sin(v),0,sin(v),cos(v));}mat3 rotateY(float v){return mat3(cos(v),0,sin(v),0,1,0,-sin(v),0,cos(v));}mat3 rotateZ(float v){return mat3(cos(v),-sin(v),0,sin(v),cos(v),0,0,0,1);}float rand(vec2 co){return fract(sin(dot(co.rg,vec2(12.9898,78.233)))*43758.5);}float distfunc(vec3 pos){float field;vec3 shipSpace=pos;shipSpace*=rotateX(time*.1);shipSpace*=rotateZ(time*.1);float shipCube=fBox(shipSpace,vec3(.2)),shipSphere=fSphere(shipSpace,.25),ship=max(shipCube,-shipSphere);vec3 trailSpace=shipSpace;trailSpace+=vec3(0.,0.,time);float trailCubeCell=pModSingle1(trailSpace.b,.2);trailSpace*=rotateX(trailCubeCell);trailSpace*=rotateY(trailCubeCell+3.);trailSpace*=rotateZ(trailCubeCell+5.);float trailCube=fBox(trailSpace,vec3(-max(-.05,shipSpace.b)));pos-=vec3(time,0.,0.);pos*=rotateX(time*.1);pos*=rotateY(time*.1);pos+=vec3(1.5);pMod3(pos,vec3(3.+.2*sin(time)));field=fSphere(pos,1.);field=min(field,ship);field=min(field,trailCube);return field;}void rayMarch(inout vec3 pos,vec3 rayDir,out vec3 normal){float totalDist=0.,dist=EPSILON;for(int i=0;i<MAX_ITER;i++){dist=distfunc(pos);totalDist+=dist;pos+=dist*rayDir;if(dist<EPSILON||totalDist>MAX_DIST)break;}if(dist<EPSILON){vec2 eps=vec2(0.,EPSILON);normal=normalize(vec3(distfunc(pos+eps.grr)-distfunc(pos-eps.grr),distfunc(pos+eps.rgr)-distfunc(pos-eps.rgr),distfunc(pos+eps.rrg)-distfunc(pos-eps.rrg)));}else normal=vec3(0.);}void main(){vec3 cameraOrigin=vec3(2.,0.,0.),cameraTarget=vec3(0.,0.,0.),upDirection=vec3(0.,1.,0.),cameraDir=normalize(cameraTarget-cameraOrigin),cameraRight=normalize(cross(upDirection,cameraOrigin)),cameraUp=cross(cameraDir,cameraRight);vec2 screenPos=-1.+2.*gl_FragCoord.rg/resolution.rg;screenPos.r*=resolution.r/resolution.g;vec3 rayDir=normalize(cameraRight*screenPos.r+cameraUp*screenPos.g+cameraDir),pos=cameraOrigin,normal,color=vec3(0.);for(int i=0;i<MAX_RECURSE;i++){rayMarch(pos,rayDir,normal);float diffuse,specular;diffuse=max(0.,dot(-rayDir,normal));specular=pow(diffuse,32.);color+=vec3(diffuse+specular-float(i)+.3);vec3 shipLight=vec3(0.);float dist=distance(pos,shipLight);diffuse=max(0.,dot(normalize(shipLight-pos),normal));specular=pow(diffuse,32.);float att=1./(1.+.1*dist+.01*dist*dist);color.r+=.3*(att*(diffuse+specular));color.g+=.1*(att*(diffuse+specular));pos-=rayDir*.1;rayDir=reflect(rayDir,normal);}color=.1+color*.7;vec2 uv=gl_FragCoord.rg/resolution.rg-vec2(.5);vec4 src=vec4(1.,1.,1.,1.);gl_FragColor=vec4(color*exp(-4.*(uv.r*uv.r+uv.g*uv.g)),1.);}";
var minifiedVert = "attribute vec3 aVertexPosition; void main(void) {gl_Position = vec4(aVertexPosition, 1.0); }";

var fragmentShader = getShader(gl, minifiedFrag, "fragment");
var vertexShader = getShader(gl, minifiedVert, "vertex");

shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
alert("Could not initialise shaders");
}

gl.useProgram(shaderProgram);

shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
tick();
}

function tick(){window.requestAnimationFrame(tick);
draw();
}

function draw()
{


gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

if (t<58000){
  t = (new Date()).getTime() - t0;
  gl.uniform1f(gl.getUniformLocation(shaderProgram, 'time'), t*0.001);

  gl.viewportWidth = c.width;
  gl.viewportHeight = c.height;
  gl.uniform2f(gl.getUniformLocation(shaderProgram, 'resolution'), gl.viewportWidth, gl.viewportHeight);

  gl.bindBuffer(gl.ARRAY_BUFFER, trianglePosBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, trianglePosBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
}

function getShader(gl, id, type) {
var shader;
if (type == "fragment") {
shader = gl.createShader(gl.FRAGMENT_SHADER);
} else if (type == "vertex") {
shader = gl.createShader(gl.VERTEX_SHADER);
} else {
return null;
}

gl.shaderSource(shader, id);
gl.compileShader(shader);
return shader;
}

(function() { //borrowed from https://jsfiddle.net/jaredwilli/qFuDr/
window.addEventListener('resize', resizeCanvas, false);
function resizeCanvas() {c.width = window.innerWidth;
c.height = window.innerHeight;
drawStuff();
}
resizeCanvas();
function drawStuff() {main();
}
})();
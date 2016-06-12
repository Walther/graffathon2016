precision highp float;
uniform float time;
uniform vec2 resolution;

const int MAX_ITER = 128;
const float MAX_DIST = 32.0;
const float EPSILON = 0.001;
const int MAX_RECURSE = 3;

// Maximum/minumum elements of a vector
float vmax(vec3 v) {
  return max(max(v.x, v.y), v.z);
}

// Repeat in three dimensions
vec3 pMod3(inout vec3 p, vec3 size) {
  vec3 c = floor((p + size*0.5)/size);
  p = mod(p + size*0.5, size) - size*0.5;
  return c;
}

// Repeat the domain only in positive direction. Everything in the negative half-space is unchanged.
float pModSingle1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  if (p >= 0.0) {
    p = mod(p + halfsize, size) - halfsize;
  }
  return c;
}

// Primitives

float fSphere(vec3 p, float r) {
  return length(p) - r;
}

// Box: correct distance to corners
float fBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d, vec3(0))) + vmax(min(d, vec3(0)));
}


// Rotations

mat3 rotateX(float v){return mat3(1,0,0,0,cos(v),-sin(v),0,sin(v),cos(v));}
mat3 rotateY(float v){return mat3(cos(v),0,sin(v),0,1,0,-sin(v),0,cos(v));}
mat3 rotateZ(float v){return mat3(cos(v),-sin(v),0,sin(v),cos(v),0,0,0,1);}

// END HELPERS

// Distance field: insert objects here
float distfunc(vec3 pos)
{
  float field;

  // Save space for ship
  vec3 shipSpace = pos;
  // rotate for ship
  shipSpace *= rotateX(time*0.1);
  shipSpace *= rotateZ(time*0.1);
  // Insert ship
  float shipCube = fBox(shipSpace, vec3(0.2));
  float shipSphere = fSphere(shipSpace, 0.25);
  float ship = max(shipCube, -shipSphere);

  // Save space for trail
  vec3 trailSpace = shipSpace;
  // Zoom in over time
  trailSpace += vec3(0.0, 0.0, time);
  // Repeat in one dir, save cellID
  float trailCubeCell = pModSingle1(trailSpace.z, 0.2);
  // Rotate in "random" dir
  trailSpace *= rotateX(trailCubeCell);
  trailSpace *= rotateY(trailCubeCell+3.0);
  trailSpace *= rotateZ(trailCubeCell+5.0);
  // Add the trailing cubes
  float trailCube = fBox(trailSpace, vec3(0.0 - max(-0.05, shipSpace.z))); //regular size
  //float trailCube = fBox(trailSpace, vec3(0.0 - min(0.01, 0.1*shipSpace.z))); // growing trail

  // Zoom in over time
  pos -= vec3(time, 0.0, 0.0);
  // Rotate
  pos *= rotateX(time*0.1);
  pos *= rotateY(time*0.1);


  // Dodge the camera
  pos += vec3(1.5);


  // Infinite spherefield, zoom the density
  pMod3(pos, vec3(3.0 + 0.2*sin(time)));

  // Combine objects
  field = fSphere(pos, 1.0);
  field = min(field, ship);
  field = min(field, trailCube);

  return field;
}

// Raymarch
// returns pos ended up at + normal
void rayMarch(inout vec3 pos, vec3 rayDir, out vec3 normal) {
  float totalDist = 0.0;
  float dist = EPSILON;
  for (int i = 0; i < MAX_ITER; i++)
  {
    dist = distfunc(pos);
    totalDist += dist;
    pos += dist * rayDir;

    if (dist < EPSILON || totalDist > MAX_DIST)
    break;
  }

  // Calculate normals
  if (dist < EPSILON)
  {
    vec2 eps = vec2(0.0, EPSILON);
    normal = normalize(vec3(
      distfunc(pos + eps.yxx) - distfunc(pos - eps.yxx),
      distfunc(pos + eps.xyx) - distfunc(pos - eps.xyx),
      distfunc(pos + eps.xxy) - distfunc(pos - eps.xxy)));
  }
  else {
    normal = vec3(0.0);
  }

}


// Main drawing loop
void main(){

  // Camera setup
  vec3 cameraOrigin = vec3(2.0, 0.0, 0.0);
  vec3 cameraTarget = vec3(0.0, 0.0, 0.0);
  vec3 upDirection = vec3(0.0, 1.0, 0.0);
  vec3 cameraDir = normalize(cameraTarget - cameraOrigin);
  vec3 cameraRight = normalize(cross(upDirection, cameraOrigin));
  vec3 cameraUp = cross(cameraDir, cameraRight);
  vec2 screenPos = -1.0 + 2.0 * gl_FragCoord.xy / resolution.xy; // screenPos can range from -1 to 1
  screenPos.x *= resolution.x / resolution.y;                   // Correct aspect ratio
  vec3 rayDir = normalize(cameraRight * screenPos.x + cameraUp * screenPos.y + cameraDir);

  // Call raymarch from camera origin
  vec3 pos = cameraOrigin;
  vec3 normal;
  vec3 color = vec3(0.0); // default color
  //vec3 color = vec3(0.153, 0.157, 0.133); // dark warm grey

  // Iterate
  for (int i = 0; i < MAX_RECURSE; i++) {
    rayMarch(pos, rayDir, normal);

    float diffuse, specular;

    // Lighting, from camera
    diffuse = max(0.0, dot(-rayDir, normal));
    specular = pow(diffuse, 32.0);
    color += vec3(diffuse + specular - float(i) +0.3);
    //color += vec3(diffuse + specular);

    // Lighting, from ship
    vec3 shipLight = vec3(0.0);
    float dist = distance(pos, shipLight);

    diffuse = max(0.0, dot(normalize(shipLight-pos), normal));
    specular = pow(diffuse, 32.0);
    float att = 1.0 / (1.0 + 0.1*dist + 0.01*dist*dist);
    color.r += 0.3*(att * (diffuse + specular));
    color.g += 0.1*(att * (diffuse + specular));


    // Change direction for re-march.
    pos -= rayDir*0.1;
    // Remember to step out a bit, to not hit the object we bounced off!
    rayDir = reflect(rayDir, normal);
  }

  // Bias the color a bit
  color = 0.1+color*0.7;

  //color = vec3(cos(time),sin(time*0.3),sin(time*0.7));

  // vignette
  vec2 uv = gl_FragCoord.xy / resolution.xy-vec2(.5);

  vec4 src = vec4(1.0,1.0,1.0,1.0);
  gl_FragColor = vec4(color * exp(-4.0*(uv.x*uv.x+uv.y*uv.y)), 1.0);

  //gl_FragColor = vec4(color, 1.0);
}

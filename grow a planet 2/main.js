// Set up the 3D scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a bright blue sphere planet right in the center
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0x0066ff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

camera.position.z = 5;

// Add background stars for reference
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 400;
const starPositions = new Float32Array(starsCount * 3);
for (let i = 0; i < starsCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 100;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

// Variables for right-click camera movement
let isRightMouseDown = false;

window.addEventListener('mousedown', (e) => {
    if (e.button === 2) isRightMouseDown = true;
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 2) isRightMouseDown = false;
});

window.addEventListener('mousemove', (e) => {
    if (isRightMouseDown) {
        camera.rotation.y -= e.movementX * 0.005;
        camera.rotation.x -= e.movementY * 0.005;
    }
});

// Stop the right-click menu from popping up
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Move the sphere using arrow keys
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') sphere.position.y += 0.2;
    if (e.key === 'ArrowDown') sphere.position.y -= 0.2;
    if (e.key === 'ArrowLeft') sphere.position.x -= 0.2;
    if (e.key === 'ArrowRight') sphere.position.x += 0.2;
});

// Animation loop to keep the game running
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
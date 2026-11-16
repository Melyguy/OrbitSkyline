"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { SavedAnime } from "@/lib/anime-list";

const buildingColors = ["#344968", "#3b5769", "#4b4967", "#3c5a5a", "#514762"];

export default function AnimeCity({ animeList }: { animeList: SavedAnime[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
    } catch {
      const errorFrame = window.requestAnimationFrame(() =>
        setRenderError(true),
      );
      return () => window.cancelAnimationFrame(errorFrame);
    }

    const successFrame = window.requestAnimationFrame(() =>
      setRenderError(false),
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#090e1b");
    scene.fog = new THREE.Fog("#090e1b", 35, 100);

    const columns = Math.ceil(Math.sqrt(animeList.length));
    const rows = Math.ceil(animeList.length / columns);
    const spacing = 6.5;
    const cityWidth = Math.max(8, columns * spacing);
    const cityDepth = Math.max(8, rows * spacing);
    const maxEpisodes =
      animeList.reduce(
        (maximum, anime) => Math.max(maximum, anime.episodes ?? 0),
        0,
      ) || 1;
    const tallestBuilding = animeList.reduce((maximum, anime) => {
      const height =
        anime.episodes === null
          ? 2
          : Math.max(0.8, (anime.episodes / maxEpisodes) * 9);
      return Math.max(maximum, height);
    }, 0);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    const targetHeight = tallestBuilding * 0.35;
    camera.position.set(
      cityWidth * 1.3,
      targetHeight + Math.max(10, cityWidth * 1.3),
      cityDepth * 1.3,
    );

    scene.add(new THREE.AmbientLight("#a9c5e8", 1.5));

    const moonlight = new THREE.DirectionalLight("#bdd9ff", 3);
    moonlight.position.set(-12, 24, 10);
    scene.add(moonlight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(cityWidth + 12, cityDepth + 12),
      new THREE.MeshStandardMaterial({ color: "#111a2b", roughness: 0.94 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    scene.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: "#1a2435",
      roughness: 1,
    });

    for (let row = 0; row < rows - 1; row += 1) {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(cityWidth, 1.15),
        roadMaterial,
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(
        0,
        0.005,
        (row - (rows - 1) / 2 + 0.5) * spacing,
      );
      scene.add(road);
    }

    for (let column = 0; column < columns - 1; column += 1) {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, cityDepth),
        roadMaterial,
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(
        (column - (columns - 1) / 2 + 0.5) * spacing,
        0.005,
        0,
      );
      scene.add(road);
    }

    const windowPlacements: {
      x: number;
      y: number;
      z: number;
      rotationY: number;
    }[] = [];

    animeList.forEach((anime, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = (column - (columns - 1) / 2) * spacing;
      const z = (row - (rows - 1) / 2) * spacing;
      const height =
        anime.episodes === null
          ? 2
          : Math.max(0.8, (anime.episodes / maxEpisodes) * 9);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.1, 0.18, 3.1),
        new THREE.MeshStandardMaterial({ color: "#26344b", roughness: 0.75 }),
      );
      base.position.set(x, 0.09, z);
      scene.add(base);

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, height, 2.2),
        new THREE.MeshStandardMaterial({
          color: buildingColors[index % buildingColors.length],
          roughness: 0.62,
          metalness: 0.18,
        }),
      );
      building.position.set(x, height / 2 + 0.18, z);
      scene.add(building);

      const rooftop = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 0.12, 1.45),
        new THREE.MeshStandardMaterial({
          color: "#f4c66a",
          emissive: "#9b6227",
          emissiveIntensity: 0.45,
        }),
      );
      rooftop.position.set(x, height + 0.26, z);
      scene.add(rooftop);

      const floorCount = Math.max(1, Math.floor(height / 0.62));
      for (let floor = 0; floor < floorCount; floor += 1) {
        const y = 0.34 + floor * 0.55;
        for (let window = 0; window < 4; window += 1) {
          const offset = (window - 1.5) * 0.45;
          windowPlacements.push(
            { x: x + offset, y, z: z + 1.11, rotationY: 0 },
            { x: x + 1.11, y, z: z + offset, rotationY: Math.PI / 2 },
          );
        }
      }

      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 256;
      labelCanvas.height = 96;
      const context = labelCanvas.getContext("2d");
      if (context) {
        context.fillStyle = "rgba(10, 16, 29, 0.92)";
        context.beginPath();
        context.roundRect(4, 4, 248, 88, 18);
        context.fill();
        context.strokeStyle = "rgba(244, 198, 106, 0.75)";
        context.lineWidth = 4;
        context.stroke();
        context.fillStyle = "#f8fafc";
        context.font = "700 48px Arial";
        context.textAlign = "center";
        context.fillText(String(index + 1).padStart(2, "0"), 128, 65);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        labelTexture.colorSpace = THREE.SRGBColorSpace;
        const label = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true,
            depthWrite: false,
          }),
        );
        label.position.set(x, height + 0.7, z);
        label.scale.set(1.7, 0.64, 1);
        scene.add(label);
      }
    });

    if (windowPlacements.length > 0) {
      const windows = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(0.2, 0.24),
        new THREE.MeshStandardMaterial({
          color: "#ffe2a1",
          emissive: "#e6a845",
          emissiveIntensity: 0.7,
          side: THREE.DoubleSide,
        }),
        windowPlacements.length,
      );
      const transform = new THREE.Object3D();
      windowPlacements.forEach((window, index) => {
        transform.position.set(window.x, window.y, window.z);
        transform.rotation.set(0, window.rotationY, 0);
        transform.updateMatrix();
        windows.setMatrixAt(index, transform.matrix);
      });
      scene.add(windows);
    }

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.target.set(0, targetHeight, 0);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 8;
    controls.maxDistance = Math.max(cityWidth, cityDepth) * 3;

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(canvas);

    let animationFrame = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(successFrame);
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
          }
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.SpriteMaterial && material.map) {
              material.map.dispose();
            }
            material.dispose();
          });
        }
      });
      renderer.dispose();
    };
  }, [animeList]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#090e1b] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.9)]">
      <canvas
        ref={canvasRef}
        aria-label="Interactive 3D city of saved series. Drag to rotate and scroll to zoom."
        className="block h-[440px] w-full sm:h-[560px]"
      />
      {renderError ? (
        <p
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-[#090e1b] px-6 text-center text-sm text-slate-300"
        >
          The 3D city is unavailable in this browser. You can still manage your
          series in the city directory below.
        </p>
      ) : (
        <p className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
          Drag to explore - Scroll to zoom
        </p>
      )}
    </div>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * AuroraMeta3D — Torus 3D elegante representando progresso da meta.
 * Paleta Aurora Borealis: accent #00D4AA, success #10b981, warning #f59e0b
 * Estático/quase-estático, com glow sutil. Mantém discrição.
 */
export default function AuroraMeta3D({ progress, expectedProgress, size = 128, achieved = false }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const arcRef = useRef(null);
  const expectedArcRef = useRef(null);
  const frameRef = useRef(null);
  const [error, setError] = useState(false);

  // Clamp values
  const pct = Math.min(Math.max(progress || 0, 0), 100);
  const expPct = Math.min(Math.max(expectedProgress || 0, 0), 100);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    try {
      const width = size;
      const height = size;

      // Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      camera.position.set(0, 0, 5);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // ── Track (background torus) ──
      const trackGeo = new THREE.TorusGeometry(1.4, 0.09, 24, 128);
      const trackMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('rgba(0,212,170,0.08)'),
        transparent: true,
        opacity: 0.15,
      });
      const track = new THREE.Mesh(trackGeo, trackMat);
      scene.add(track);

      // ── Expected arc (dim, behind) ──
      const expColor = new THREE.Color('#00D4AA');
      const expectedGeo = new THREE.TorusGeometry(1.4, 0.07, 24, 128, (expPct / 100) * Math.PI * 2);
      const expectedMat = new THREE.MeshBasicMaterial({
        color: expColor,
        transparent: true,
        opacity: 0.25,
      });
      const expectedArc = new THREE.Mesh(expectedGeo, expectedMat);
      expectedArc.rotation.z = Math.PI / 2; // start from top
      scene.add(expectedArc);
      expectedArcRef.current = expectedArc;

      // ── Progress arc (main, emissive glow) ──
      const mainColor = achieved ? new THREE.Color('#10b981') : new THREE.Color('#00D4AA');
      const arcGeo = new THREE.TorusGeometry(1.4, 0.11, 24, 128, (pct / 100) * Math.PI * 2);
      const arcMat = new THREE.MeshBasicMaterial({
        color: mainColor,
        transparent: true,
        opacity: 0.95,
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.rotation.z = Math.PI / 2; // start from top
      scene.add(arc);
      arcRef.current = arc;

      // ── Glow ring (slightly larger, blurred feel) ──
      const glowGeo = new THREE.TorusGeometry(1.4, 0.2, 16, 96, (pct / 100) * Math.PI * 2);
      const glowMat = new THREE.MeshBasicMaterial({
        color: mainColor,
        transparent: true,
        opacity: 0.08,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.z = Math.PI / 2;
      scene.add(glow);

      // ── Subtle tilt for depth ──
      scene.rotation.x = -0.35;
      scene.rotation.y = 0.15;

      // ── Very slow drift animation ──
      let elapsed = 0;
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        elapsed += 0.003;
        scene.rotation.y = 0.15 + Math.sin(elapsed) * 0.04;
        scene.rotation.x = -0.35 + Math.sin(elapsed * 0.7) * 0.02;
        renderer.render(scene, camera);
      };
      animate();

      // Cleanup
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        if (rendererRef.current) {
          rendererRef.current.dispose();
          if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
            rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
          }
        }
        trackGeo.dispose();
        trackMat.dispose();
        expectedGeo.dispose();
        expectedMat.dispose();
        arcGeo.dispose();
        arcMat.dispose();
        glowGeo.dispose();
        glowMat.dispose();
      };
    } catch (e) {
      console.error('[AuroraMeta3D] init error:', e);
      setError(true);
    }
  }, []);

  // Update arc when progress changes
  useEffect(() => {
    if (!sceneRef.current || !arcRef.current || !expectedArcRef.current) return;

    // Rebuild progress arc geometry
    const mainColor = achieved ? new THREE.Color('#10b981') : new THREE.Color('#00D4AA');
    arcRef.current.material.color = mainColor;
    arcRef.current.geometry.dispose();
    arcRef.current.geometry = new THREE.TorusGeometry(1.4, 0.11, 24, 128, (pct / 100) * Math.PI * 2);

    // Rebuild expected arc
    expectedArcRef.current.geometry.dispose();
    expectedArcRef.current.geometry = new THREE.TorusGeometry(1.4, 0.07, 24, 128, (expPct / 100) * Math.PI * 2);
  }, [pct, expPct, achieved]);

  if (error) return null;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div ref={mountRef} className="w-full h-full" />
      {/* Overlay text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold" style={{ color: achieved ? '#10b981' : '#e6edf3' }}>
          {Math.round(pct)}%
        </span>
        <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>
          da meta
        </span>
      </div>
    </div>
  );
}
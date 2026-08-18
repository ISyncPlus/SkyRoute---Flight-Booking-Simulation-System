"use client";

import { useRef, useEffect, useState } from "react";
import { Renderer, Program, Triangle, Mesh } from "ogl";
import { useTheme } from "next-themes";

type Origin = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export interface SideRaysProps {
  speed?: number;
  rayColor1?: string;
  rayColor2?: string;
  lightRayColor1?: string;
  lightRayColor2?: string;
  darkRayColor1?: string;
  darkRayColor2?: string;
  intensity?: number;
  lightIntensity?: number;
  darkIntensity?: number;
  spread?: number;
  origin?: Origin;
  tilt?: number;
  saturation?: number;
  blend?: number;
  falloff?: number;
  lightFalloff?: number;
  darkFalloff?: number;
  opacity?: number;
  lightOpacity?: number;
  darkOpacity?: number;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [1, 1, 1];
};

const originToFlip = (origin: Origin): [number, number] => {
  switch (origin) {
    case "top-left":
      return [1, 0];
    case "bottom-right":
      return [0, 1];
    case "bottom-left":
      return [1, 1];
    default:
      return [0, 0];
  }
};

export const SideRays = ({
  speed = 2.0,
  rayColor1,
  rayColor2,
  lightRayColor1 = "#0d6b5e",
  lightRayColor2 = "#0284c7",
  darkRayColor1 = "#2fc4ae",
  darkRayColor2 = "#38bdf8",
  intensity,
  lightIntensity = 1.2,
  darkIntensity = 1.8,
  spread = 2.0,
  origin = "top-right",
  tilt = 0,
  saturation = 1.4,
  blend = 0.7,
  falloff,
  lightFalloff = 2.2,
  darkFalloff = 1.8,
  opacity,
  lightOpacity = 0.45,
  darkOpacity = 0.8,
  className = "",
}: SideRaysProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, { value: number | number[] }> | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Theme support
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  // Active theme-resolved values
  const activeRayColor1 = rayColor1 ?? (isDark ? darkRayColor1 : lightRayColor1);
  const activeRayColor2 = rayColor2 ?? (isDark ? darkRayColor2 : lightRayColor2);
  const activeIntensity = intensity ?? (isDark ? darkIntensity : lightIntensity);
  const activeFalloff = falloff ?? (isDark ? darkFalloff : lightFalloff);
  const activeOpacity = opacity ?? (isDark ? darkOpacity : lightOpacity);

  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
      cleanupFunctionRef.current = null;
    }

    const initializeWebGL = async () => {
      if (!containerRef.current) return;

      await new Promise<void>((resolve) => setTimeout(resolve, 10));

      if (!containerRef.current) return;

      const renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: true,
      });
      rendererRef.current = renderer;

      const gl = renderer.gl;
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      gl.canvas.style.display = "block";

      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(gl.canvas);

      const vert = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

      const frag = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform vec3 iRayColor1;
uniform vec3 iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0) *
    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);

  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = color;
}`;

      const [flipX, flipY] = originToFlip(origin);
      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] as number[] },
        iSpeed: { value: speed },
        iRayColor1: { value: hexToRgb(activeRayColor1) as number[] },
        iRayColor2: { value: hexToRgb(activeRayColor2) as number[] },
        iIntensity: { value: activeIntensity },
        iSpread: { value: spread },
        iFlipX: { value: flipX },
        iFlipY: { value: flipY },
        iTilt: { value: tilt },
        iSaturation: { value: saturation },
        iBlend: { value: blend },
        iFalloff: { value: activeFalloff },
        iOpacity: { value: activeOpacity },
      };
      uniformsRef.current = uniforms;

      const geometry = new Triangle(gl);
      const program = new Program(gl, { vertex: vert, fragment: frag, uniforms });
      const mesh = new Mesh(gl, { geometry, program });
      meshRef.current = mesh;

      const updateSize = () => {
        if (!containerRef.current || !rendererRef.current) return;
        const r = rendererRef.current;
        r.dpr = Math.min(window.devicePixelRatio || 1, 2);
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        if (w > 0 && h > 0) {
          r.setSize(w, h);
          uniforms.iResolution.value = [w * r.dpr, h * r.dpr];
        }
      };

      const loop = (t: number) => {
        if (!rendererRef.current || !uniformsRef.current || !meshRef.current) return;
        uniformsRef.current.iTime.value = t * 0.001;
        try {
          rendererRef.current.render({ scene: meshRef.current });
          animationIdRef.current = requestAnimationFrame(loop);
        } catch {
          return;
        }
      };

      window.addEventListener("resize", updateSize);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          updateSize();
        });
        resizeObserver.observe(containerRef.current);
      }

      updateSize();
      animationIdRef.current = requestAnimationFrame(loop);

      cleanupFunctionRef.current = () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
        window.removeEventListener("resize", updateSize);
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
        if (rendererRef.current) {
          try {
            const loseCtx = rendererRef.current.gl.getExtension("WEBGL_lose_context");
            if (loseCtx) loseCtx.loseContext();
            const canvas = rendererRef.current.gl.canvas;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
          } catch {}
        }
        rendererRef.current = null;
        uniformsRef.current = null;
        meshRef.current = null;
      };
    };

    initializeWebGL();

    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
        cleanupFunctionRef.current = null;
      }
    };
    // Dynamic uniform properties (colors, intensity, opacity, falloff) are updated
    // in-place via the dedicated effect below to avoid tearing down the WebGL context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, speed, spread, origin, tilt, saturation, blend]);

  // Update uniforms when theme / color props change without reinitializing WebGL
  useEffect(() => {
    if (!uniformsRef.current) return;
    const u = uniformsRef.current;
    u.iSpeed.value = speed;
    u.iRayColor1.value = hexToRgb(activeRayColor1);
    u.iRayColor2.value = hexToRgb(activeRayColor2);
    u.iIntensity.value = activeIntensity;
    u.iSpread.value = spread;
    const [flipX, flipY] = originToFlip(origin);
    u.iFlipX.value = flipX;
    u.iFlipY.value = flipY;
    u.iTilt.value = tilt;
    u.iSaturation.value = saturation;
    u.iBlend.value = blend;
    u.iFalloff.value = activeFalloff;
    u.iOpacity.value = activeOpacity;
  }, [
    speed,
    activeRayColor1,
    activeRayColor2,
    activeIntensity,
    spread,
    origin,
    tilt,
    saturation,
    blend,
    activeFalloff,
    activeOpacity,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden pointer-events-none ${className}`.trim()}
    />
  );
};

export default SideRays;

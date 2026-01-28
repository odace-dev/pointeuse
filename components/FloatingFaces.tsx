'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.webp',
  '/avatars/avatar-3.webp',
  '/avatars/avatar-4.webp',
  '/avatars/avatar-5.webp',
  '/avatars/avatar-6.webp',
  '/avatars/avatar-7.webp',
  '/avatars/avatar-8.webp',
  '/avatars/avatar-9.png',
  '/avatars/avatar-10.png',
  '/avatars/avatar-11.png',
];

const NUM_FACES = 30;
const EDGE_THRESHOLD = 50;

interface FloatingFace {
  id: number;
  src: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  scaleDir: number;
  isDragging: boolean;
  isAtEdge: boolean;
}

// Phrases to say when hitting edge
const OUCH_PHRASES_FR = [
  'Aïe!',
  'Outch!',
  'Oh!',
  'Aouh!',
  'Hey!',
  'Non!',
  'Aïe aïe aïe!',
  'Ah!',
  'Stop!',
  'Mais arrête!',
];

const OUCH_PHRASES_EN = [
  'Ouch!',
  'Ow!',
  'Hey!',
  'Stop!',
  'No!',
  'Ah!',
  'Oh no!',
  'That hurts!',
  'Owie!',
  'Watch it!',
];

// Play "Aïe!" sound using Speech Synthesis
function playAieSound() {
  try {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Detect browser language
      const isFrench = navigator.language.startsWith('fr');
      const phrases = isFrench ? OUCH_PHRASES_FR : OUCH_PHRASES_EN;
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];

      const utterance = new SpeechSynthesisUtterance(phrase);

      // Settings for a fun, quick exclamation
      utterance.rate = 1.3;
      utterance.pitch = 1.2 + Math.random() * 0.5;
      utterance.volume = 0.8;

      // Try to get a matching voice
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v =>
        isFrench ? v.lang.startsWith('fr') : v.lang.startsWith('en')
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.log('Speech synthesis not supported');
  }
}

export default function FloatingFaces() {
  const [faces, setFaces] = useState<FloatingFace[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [draggedFace, setDraggedFace] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastEdgeSound = useRef(0);

  useEffect(() => {
    // Detect mobile
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    if (mobile) return; // Don't initialize faces on mobile

    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const initialFaces: FloatingFace[] = Array.from({ length: NUM_FACES }, (_, i) => ({
      id: i,
      src: AVATARS[i % AVATARS.length],
      x: Math.random() * (window.innerWidth - 60),
      y: Math.random() * (window.innerHeight - 60),
      vx: (Math.random() - 0.5) * 4 + (Math.random() > 0.5 ? 2 : -2),
      vy: (Math.random() - 0.5) * 4 + (Math.random() > 0.5 ? 2 : -2),
      size: 35 + Math.random() * 40,
      baseSize: 35 + Math.random() * 40,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 3,
      scale: 1,
      scaleDir: 1,
      isDragging: false,
      isAtEdge: false,
    }));

    setFaces(initialFaces);

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, faceId: number) => {
    e.preventDefault();
    const face = faces.find(f => f.id === faceId);
    if (!face) return;

    dragOffset.current = {
      x: e.clientX - face.x,
      y: e.clientY - face.y,
    };
    setDraggedFace(faceId);
    setFaces(prev => prev.map(f =>
      f.id === faceId ? { ...f, isDragging: true, vx: 0, vy: 0 } : f
    ));
  }, [faces]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggedFace === null) return;

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    // Check if near edge
    const nearEdge =
      newX < EDGE_THRESHOLD ||
      newX > dimensions.width - EDGE_THRESHOLD - 60 ||
      newY < EDGE_THRESHOLD ||
      newY > dimensions.height - EDGE_THRESHOLD - 60;

    // Play sound if just hit edge (with cooldown)
    if (nearEdge && Date.now() - lastEdgeSound.current > 300) {
      playAieSound();
      lastEdgeSound.current = Date.now();
    }

    setFaces(prev => prev.map(f =>
      f.id === draggedFace
        ? {
            ...f,
            x: Math.max(0, Math.min(newX, dimensions.width - f.size)),
            y: Math.max(0, Math.min(newY, dimensions.height - f.size)),
            isAtEdge: nearEdge,
            size: nearEdge ? f.baseSize * 1.8 : f.baseSize,
          }
        : f
    ));
  }, [draggedFace, dimensions]);

  const handleMouseUp = useCallback(() => {
    if (draggedFace === null) return;

    setFaces(prev => prev.map(f =>
      f.id === draggedFace
        ? {
            ...f,
            isDragging: false,
            isAtEdge: false,
            size: f.baseSize,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
          }
        : f
    ));
    setDraggedFace(null);
  }, [draggedFace]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (faces.length === 0 || dimensions.width === 0) return;

    const animate = () => {
      setFaces(prevFaces =>
        prevFaces.map(face => {
          // Skip animation for dragged face
          if (face.isDragging) return face;

          let newX = face.x + face.vx;
          let newY = face.y + face.vy;
          let newVx = face.vx;
          let newVy = face.vy;
          let newRotationSpeed = face.rotationSpeed;
          let newScale = face.scale;
          let newScaleDir = face.scaleDir;

          const hitWall = { x: false, y: false };

          if (newX <= 0) {
            newVx = Math.abs(newVx) * (0.95 + Math.random() * 0.15);
            newX = 0;
            hitWall.x = true;
          } else if (newX >= dimensions.width - face.size) {
            newVx = -Math.abs(newVx) * (0.95 + Math.random() * 0.15);
            newX = dimensions.width - face.size;
            hitWall.x = true;
          }

          if (newY <= 0) {
            newVy = Math.abs(newVy) * (0.95 + Math.random() * 0.15);
            newY = 0;
            hitWall.y = true;
          } else if (newY >= dimensions.height - face.size) {
            newVy = -Math.abs(newVy) * (0.95 + Math.random() * 0.15);
            newY = dimensions.height - face.size;
            hitWall.y = true;
          }

          if (hitWall.x || hitWall.y) {
            newRotationSpeed = face.rotationSpeed * -2;
            newScaleDir = -1;
          }

          newScale = face.scale + (0.03 * face.scaleDir);
          if (newScale > 1.15) {
            newScale = 1.15;
            newScaleDir = -1;
          } else if (newScale < 0.85) {
            newScale = 0.85;
            newScaleDir = 1;
          }

          newRotationSpeed = newRotationSpeed * 0.97 + ((Math.random() - 0.5) * 0.15);

          return {
            ...face,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            rotation: face.rotation + newRotationSpeed,
            rotationSpeed: newRotationSpeed,
            scale: newScale,
            scaleDir: newScaleDir,
          };
        })
      );
    };

    const intervalId = setInterval(animate, 16);
    return () => clearInterval(intervalId);
  }, [faces.length, dimensions]);

  if (isMobile || dimensions.width === 0) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-[5]" style={{ pointerEvents: 'none' }}>
      {faces.map(face => (
        <img
          key={face.id}
          src={face.src}
          alt=""
          draggable={false}
          onMouseDown={(e) => handleMouseDown(e, face.id)}
          className={`absolute rounded-full select-none transition-shadow hover:opacity-60 hover:scale-110 ${
            face.isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
          } ${face.isAtEdge ? 'shadow-2xl shadow-red-500/50' : ''}`}
          style={{
            left: face.x,
            top: face.y,
            width: face.size,
            height: face.size,
            opacity: face.isDragging ? 0.95 : face.isAtEdge ? 0.85 : 0.18,
            transform: `rotate(${face.rotation}deg) scale(${face.isDragging ? 1.3 : face.scale})`,
            filter: face.isDragging ? 'grayscale(0%) drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'grayscale(30%)',
            transition: face.isDragging ? 'none' : 'opacity 0.2s, filter 0.2s, transform 0.2s',
            pointerEvents: 'auto',
            zIndex: face.isDragging ? 9999 : 5,
          }}
        />
      ))}
    </div>
  );
}

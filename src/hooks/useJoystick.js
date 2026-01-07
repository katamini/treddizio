import { useState, useEffect, useRef } from 'react';

export function useJoystick() {
  const [angle, setAngle] = useState(null);
  const [isPressed, setIsPressed] = useState(false);
  const [buttons, setButtons] = useState({});
  const containerRef = useRef(null);
  const joystickRef = useRef(null);
  const isActiveRef = useRef(false);
  const keysRef = useRef({});

  useEffect(() => {
    // Create joystick UI
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 120px;
      height: 120px;
      z-index: 1000;
      touch-action: none;
    `;
    
    const joystick = document.createElement('div');
    joystick.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      border: 2px solid rgba(255, 255, 255, 0.5);
      position: relative;
    `;
    
    const handle = document.createElement('div');
    handle.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.8);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: transform 0.1s;
    `;
    
    joystick.appendChild(handle);
    container.appendChild(joystick);
    document.body.appendChild(container);
    
    containerRef.current = container;
    joystickRef.current = { container, joystick, handle };
    
    const getPosition = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left - rect.width / 2,
        y: clientY - rect.top - rect.height / 2
      };
    };
    
    const updateJoystick = (e) => {
      if (!isActiveRef.current) return;
      
      const pos = getPosition(e);
      const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      const maxDistance = container.offsetWidth / 2 - 20;
      
      if (distance > maxDistance) {
        pos.x = (pos.x / distance) * maxDistance;
        pos.y = (pos.y / distance) * maxDistance;
      }
      
      const angle = Math.atan2(pos.x, pos.y);
      setAngle(angle);
      setIsPressed(true);
      
      handle.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`;
    };
    
    const resetJoystick = () => {
      isActiveRef.current = false;
      setAngle(null);
      setIsPressed(false);
      handle.style.transform = 'translate(-50%, -50%)';
    };
    
    const onStart = (e) => {
      e.preventDefault();
      isActiveRef.current = true;
      updateJoystick(e);
    };
    
    const onMove = (e) => {
      e.preventDefault();
      updateJoystick(e);
    };
    
    const onEnd = (e) => {
      e.preventDefault();
      resetJoystick();
    };
    
    container.addEventListener('mousedown', onStart);
    container.addEventListener('touchstart', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    
    // Fire button
    const fireButton = document.createElement('button');
    fireButton.textContent = 'FIRE';
    fireButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255, 0, 0, 0.7);
      border: 2px solid rgba(255, 255, 255, 0.5);
      color: white;
      font-weight: bold;
      z-index: 1000;
      touch-action: none;
    `;
    document.body.appendChild(fireButton);
    
    const onFireStart = () => {
      setButtons(prev => ({ ...prev, fire: true }));
    };
    
    const onFireEnd = () => {
      setButtons(prev => ({ ...prev, fire: false }));
    };
    
    fireButton.addEventListener('mousedown', onFireStart);
    fireButton.addEventListener('touchstart', onFireStart);
    fireButton.addEventListener('mouseup', onFireEnd);
    fireButton.addEventListener('touchend', onFireEnd);
    
    // Keyboard controls
    const onKeyDown = (e) => {
      keysRef.current[e.code] = true;
      
      // Calculate movement angle from arrow keys
      let x = 0, z = 0;
      if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) z -= 1;
      if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) z += 1;
      if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) x -= 1;
      if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) x += 1;
      
      if (x !== 0 || z !== 0) {
        const newAngle = Math.atan2(x, z);
        setAngle(newAngle);
        setIsPressed(true);
      }
      
      // Spacebar for fire
      if (e.code === 'Space') {
        e.preventDefault();
        setButtons(prev => ({ ...prev, fire: true }));
      }
    };
    
    const onKeyUp = (e) => {
      keysRef.current[e.code] = false;
      
      // Check if any movement keys are still pressed
      const hasMovement = 
        keysRef.current['ArrowUp'] || keysRef.current['KeyW'] ||
        keysRef.current['ArrowDown'] || keysRef.current['KeyS'] ||
        keysRef.current['ArrowLeft'] || keysRef.current['KeyA'] ||
        keysRef.current['ArrowRight'] || keysRef.current['KeyD'];
      
      if (!hasMovement) {
        setAngle(null);
        setIsPressed(false);
      } else {
        // Recalculate angle
        let x = 0, z = 0;
        if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) z -= 1;
        if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) z += 1;
        if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) x -= 1;
        if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) x += 1;
        if (x !== 0 || z !== 0) {
          setAngle(Math.atan2(x, z));
        }
      }
      
      // Spacebar release
      if (e.code === 'Space') {
        e.preventDefault();
        setButtons(prev => ({ ...prev, fire: false }));
      }
    };
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    return () => {
      container.remove();
      fireButton.remove();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);
  
  return {
    angle: () => angle,
    isJoystickPressed: () => isPressed,
    isPressed: (button) => buttons[button] || false
  };
}


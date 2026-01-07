import { Billboard, CameraControls, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, vec3 } from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import { CharacterSoldier } from "./CharacterSoldier";
const MOVEMENT_SPEED = 202;
const FIRE_RATE = 380;
export const WEAPON_OFFSET = {
  x: -0.2,
  y: 1.4,
  z: 0.8,
};

export const CharacterController = ({
  player,
  joystick,
  userPlayer,
  onKilled,
  onFire,
  downgradedPerformance,
  updatePlayerState,
  ...props
}) => {
  const group = useRef();
  const character = useRef();
  const rigidbody = useRef();
  const [animation, setAnimation] = useState("Idle");
  const [weapon, setWeapon] = useState("AK");
  const lastShoot = useRef(0);
  const lastRotationY = useRef(0); // Track rotation for fire direction
  const lastPositionUpdate = useRef(0); // Throttle position updates
  const POSITION_UPDATE_INTERVAL = 100; // Send position every 100ms (10 times per second)

  const scene = useThree((state) => state.scene);
  const spawnRandomly = () => {
    const spawns = [];
    for (let i = 0; i < 1000; i++) {
      const spawn = scene.getObjectByName(`spawn_${i}`);
      if (spawn) {
        spawns.push(spawn);
      } else {
        break;
      }
    }
    if (spawns.length > 0 && rigidbody.current && rigidbody.current.setTranslation) {
      const spawnPos = spawns[Math.floor(Math.random() * spawns.length)].position;
      rigidbody.current.setTranslation(spawnPos);
    }
  };

  useEffect(() => {
    if (userPlayer && rigidbody.current) {
      // Local player: spawn randomly (only once on mount)
      spawnRandomly();
    } else if (!userPlayer && rigidbody.current) {
      // Remote player: set initial position if available
      const pos = player.state.pos;
      if (pos && Array.isArray(pos) && pos.length >= 3) {
        rigidbody.current.setTranslation({ x: pos[0], y: pos[1], z: pos[2] });
      } else if (!pos) {
        // No position yet, spawn at origin
        rigidbody.current.setTranslation({ x: 0, y: 1.28, z: 0 });
      }
    }
  }, [userPlayer]); // Only run on mount, not when position changes

  useEffect(() => {
    if (player.state.dead) {
      const audio = new Audio("./audios/dead.mp3");
      audio.volume = 0.5;
      audio.play();
    }
  }, [player.state.dead]);

  useEffect(() => {
    if (player.state.health < 100) {
      const audio = new Audio("./audios/hurt.mp3");
      audio.volume = 0.4;
      audio.play();
    }
  }, [player.state.health]);

  useFrame((_, delta) => {
    // Safety check: ensure rigidbody is initialized
    if (!rigidbody.current || !rigidbody.current.translation) return;

    // CAMERA FOLLOW
    if (controls.current && userPlayer && rigidbody.current) {
      const cameraDistanceY = window.innerWidth < 1024 ? 16 : 20;
      const cameraDistanceZ = window.innerWidth < 1024 ? 12 : 16;
      const translation = rigidbody.current.translation();
      if (translation) {
        const playerWorldPos = vec3(translation);
        controls.current.setLookAt(
          playerWorldPos.x,
          playerWorldPos.y + (player.state.dead ? 12 : cameraDistanceY),
          playerWorldPos.z + (player.state.dead ? 2 : cameraDistanceZ),
          playerWorldPos.x,
          playerWorldPos.y + 1.5,
          playerWorldPos.z,
          true
        );
      }
    }

    if (player.state.dead) {
      setAnimation("Death");
      return;
    }

    // Update player position based on joystick/keyboard state
    const angle = joystick.angle();
    const isMoving = joystick.isJoystickPressed() && angle !== null;
    
    if (userPlayer && isMoving && rigidbody.current) {
      setAnimation("Run");
      if (character.current) {
        character.current.rotation.y = angle;
        lastRotationY.current = angle; // Track rotation for fire direction
      }

      // move character in its own direction
      const impulse = {
        x: Math.sin(angle) * MOVEMENT_SPEED * delta,
        y: 0,
        z: Math.cos(angle) * MOVEMENT_SPEED * delta,
      };

      // All players apply physics locally
      if (rigidbody.current && rigidbody.current.applyImpulse) {
        rigidbody.current.applyImpulse(impulse, true);
      }
    } else {
      setAnimation("Idle");
    }
    
    // Update remote player rotation based on movement direction
    if (!userPlayer && character.current && player.state.pos) {
      // Calculate rotation from last position if available
      // For now, keep last known rotation
    }

    // Check if fire button is pressed
    if (userPlayer && joystick.isPressed("fire") && rigidbody.current) {
      // fire
      const currentAngle = joystick.angle();
      // Use joystick angle if available, otherwise use character rotation (for keyboard)
      const fireAngle = currentAngle !== null ? currentAngle : 
                       (character.current ? character.current.rotation.y : lastRotationY.current);
      
      setAnimation(
        isMoving && currentAngle !== null ? "Run_Shoot" : "Idle_Shoot"
      );
      // All players can fire
      if (rigidbody.current && rigidbody.current.translation) {
        if (Date.now() - lastShoot.current > FIRE_RATE) {
          lastShoot.current = Date.now();
          const translation = rigidbody.current.translation();
          if (translation) {
            const newBullet = {
              id: player.id + "-" + +new Date(),
              position: vec3(translation),
              angle: fireAngle,
              player: player.id,
            };
            onFire(newBullet);
          }
        }
      }
    }

    // Sync position: local player sends (throttled), remote players receive
    const now = Date.now();
    if (userPlayer && rigidbody.current && rigidbody.current.translation) {
      // Local player: send position to network (throttled to avoid spam)
      if (now - lastPositionUpdate.current > POSITION_UPDATE_INTERVAL) {
        lastPositionUpdate.current = now;
        const translation = rigidbody.current.translation();
        if (translation) {
          // Convert Vector3 to array for network sync
          const posArray = [translation.x, translation.y, translation.z];
          updatePlayerState(player.id, { 
            pos: posArray,
            rotation: character.current ? character.current.rotation.y : lastRotationY.current
          });
        }
      }
    } else if (!userPlayer && rigidbody.current && rigidbody.current.setTranslation) {
      // Remote player ONLY: update position from network
      // NEVER apply network position to local player!
      const pos = player.state.pos;
      if (pos && Array.isArray(pos) && pos.length >= 3) {
        // Smooth interpolation for remote players
        const currentPos = rigidbody.current.translation();
        if (currentPos) {
          const targetPos = { x: pos[0], y: pos[1], z: pos[2] };
          // Interpolate for smooth movement
          const lerpFactor = Math.min(1, delta * 10); // Smooth interpolation
          const newPos = {
            x: currentPos.x + (targetPos.x - currentPos.x) * lerpFactor,
            y: currentPos.y + (targetPos.y - currentPos.y) * lerpFactor,
            z: currentPos.z + (targetPos.z - currentPos.z) * lerpFactor
          };
          rigidbody.current.setTranslation(newPos);
        } else {
          // First time, set directly
          rigidbody.current.setTranslation({ x: pos[0], y: pos[1], z: pos[2] });
        }
      } else if (pos && typeof pos === 'object' && pos.x !== undefined) {
        // Already a Vector3-like object
        const currentPos = rigidbody.current.translation();
        if (currentPos) {
          const lerpFactor = Math.min(1, delta * 10);
          const newPos = {
            x: currentPos.x + (pos.x - currentPos.x) * lerpFactor,
            y: currentPos.y + (pos.y - currentPos.y) * lerpFactor,
            z: currentPos.z + (pos.z - currentPos.z) * lerpFactor
          };
          rigidbody.current.setTranslation(newPos);
        } else {
          rigidbody.current.setTranslation(pos);
        }
      }
      
      // Update rotation if available
      if (player.state.rotation !== undefined && character.current) {
        character.current.rotation.y = player.state.rotation;
      }
    }
  });
  const controls = useRef();
  const directionalLight = useRef();

  useEffect(() => {
    if (character.current && userPlayer) {
      directionalLight.current.target = character.current;
    }
  }, [character.current, userPlayer]);

  return (
    <group {...props} ref={group}>
      {userPlayer && <CameraControls ref={controls} />}
      <RigidBody
        ref={rigidbody}
        colliders={false}
        linearDamping={12}
        lockRotations
        type={userPlayer ? "dynamic" : "kinematicPosition"}
        onIntersectionEnter={({ other }) => {
          if (
            userPlayer &&
            other.rigidBody.userData.type === "bullet" &&
            other.rigidBody.userData.player !== player.id &&
            player.state.health > 0
          ) {
            const newHealth =
              player.state.health - other.rigidBody.userData.damage;
            if (newHealth <= 0) {
              updatePlayerState(player.id, {
                deaths: (player.state.deaths || 0) + 1,
                dead: true,
                health: 0
              });
              rigidbody.current.setEnabled(false);
              setTimeout(() => {
                spawnRandomly();
                rigidbody.current.setEnabled(true);
                updatePlayerState(player.id, {
                  health: 100,
                  dead: false
                });
              }, 2000);
              onKilled(player.id, other.rigidBody.userData.player);
            } else {
              updatePlayerState(player.id, { health: newHealth });
            }
          }
        }}
      >
        <PlayerInfo state={player.state} />
        <group ref={character}>
          <CharacterSoldier
            color={player.state.profile?.color}
            animation={animation}
            weapon={weapon}
          />
          {userPlayer && (
            <Crosshair
              position={[WEAPON_OFFSET.x, WEAPON_OFFSET.y, WEAPON_OFFSET.z]}
            />
          )}
        </group>
        {userPlayer && (
          <directionalLight
            ref={directionalLight}
            position={[25, 18, -25]}
            intensity={0.3}
            castShadow={!downgradedPerformance}
            shadow-camera-near={0}
            shadow-camera-far={100}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />
        )}
        <CapsuleCollider args={[0.7, 0.6]} position={[0, 1.28, 0]} />
      </RigidBody>
    </group>
  );
};

const PlayerInfo = ({ state }) => {
  const health = state.health;
  const name = state.profile?.name || "Player";
  return (
    <Billboard position-y={2.5}>
      <Text position-y={0.36} fontSize={0.4}>
        {name}
        <meshBasicMaterial color={state.profile?.color || "#ffffff"} />
      </Text>
      <mesh position-z={-0.1}>
        <planeGeometry args={[1, 0.2]} />
        <meshBasicMaterial color="black" transparent opacity={0.5} />
      </mesh>
      <mesh scale-x={health / 100} position-x={-0.5 * (1 - health / 100)}>
        <planeGeometry args={[1, 0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </Billboard>
  );
};

const Crosshair = (props) => {
  return (
    <group {...props}>
      <mesh position-z={1}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" transparent opacity={0.9} />
      </mesh>
      <mesh position-z={2}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" transparent opacity={0.85} />
      </mesh>
      <mesh position-z={3}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" transparent opacity={0.8} />
      </mesh>

      <mesh position-z={4.5}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" opacity={0.7} transparent />
      </mesh>

      <mesh position-z={6.5}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" opacity={0.6} transparent />
      </mesh>

      <mesh position-z={9}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" opacity={0.2} transparent />
      </mesh>
    </group>
  );
};

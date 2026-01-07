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
  isHost,
  updatePlayerState,
  ...props
}) => {
  const group = useRef();
  const character = useRef();
  const rigidbody = useRef();
  const [animation, setAnimation] = useState("Idle");
  const [weapon, setWeapon] = useState("AK");
  const lastShoot = useRef(0);

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
    if (spawns.length > 0) {
      const spawnPos = spawns[Math.floor(Math.random() * spawns.length)].position;
      rigidbody.current.setTranslation(spawnPos);
    }
  };

  useEffect(() => {
    if (isHost && userPlayer) {
      spawnRandomly();
    }
  }, [isHost, userPlayer]);

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
    if (!rigidbody.current) return;

    // CAMERA FOLLOW
    if (controls.current && userPlayer) {
      const cameraDistanceY = window.innerWidth < 1024 ? 16 : 20;
      const cameraDistanceZ = window.innerWidth < 1024 ? 12 : 16;
      const playerWorldPos = vec3(rigidbody.current.translation());
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

    if (player.state.dead) {
      setAnimation("Death");
      return;
    }

    // Update player position based on joystick/keyboard state
    const angle = joystick.angle();
    const isMoving = joystick.isJoystickPressed() && angle !== null;
    
    if (userPlayer && isMoving) {
      setAnimation("Run");
      if (character.current) {
        character.current.rotation.y = angle;
      }

      // move character in its own direction
      const impulse = {
        x: Math.sin(angle) * MOVEMENT_SPEED * delta,
        y: 0,
        z: Math.cos(angle) * MOVEMENT_SPEED * delta,
      };

      if (isHost && rigidbody.current) {
        rigidbody.current.applyImpulse(impulse, true);
      }
    } else {
      setAnimation("Idle");
    }

    // Check if fire button is pressed
    if (userPlayer && joystick.isPressed("fire")) {
      // fire
      const currentAngle = joystick.angle();
      setAnimation(
        isMoving && currentAngle !== null ? "Run_Shoot" : "Idle_Shoot"
      );
      if (isHost && rigidbody.current) {
        if (Date.now() - lastShoot.current > FIRE_RATE) {
          lastShoot.current = Date.now();
          const newBullet = {
            id: player.id + "-" + +new Date(),
            position: vec3(rigidbody.current.translation()),
            angle: currentAngle || 0,
            player: player.id,
          };
          onFire(newBullet);
        }
      }
    }

    if (isHost && userPlayer && rigidbody.current) {
      const pos = rigidbody.current.translation();
      updatePlayerState(player.id, { pos });
    } else if (!isHost && !userPlayer && rigidbody.current) {
      const pos = player.state.pos;
      if (pos) {
        rigidbody.current.setTranslation(pos);
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
        type={isHost && userPlayer ? "dynamic" : "kinematicPosition"}
        onIntersectionEnter={({ other }) => {
          if (
            isHost &&
            other.rigidBody.userData.type === "bullet" &&
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

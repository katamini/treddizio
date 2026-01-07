import { Environment } from "@react-three/drei";
import { useEffect, useState } from "react";
import { useTrysteroRoom } from "../hooks/useTrysteroRoom";
import { useJoystick } from "../hooks/useJoystick";
import { Bullet } from "./Bullet";
import { BulletHit } from "./BulletHit";
import { CharacterController } from "./CharacterController";
import { Map } from "./Map";

export const Experience = ({ downgradedPerformance = false }) => {
  const { players, myPlayerId, isHost, updatePlayerState, myPlayer, actions } = useTrysteroRoom();
  const [bullets, setBullets] = useState([]);
  const [hits, setHits] = useState([]);
  const [networkBullets, setNetworkBullets] = useState([]);
  const [networkHits, setNetworkHits] = useState([]);
  
  // Create joystick for local player
  const joystick = useJoystick();

  // Sync bullets across network (only host sends)
  useEffect(() => {
    if (actions.sendBullets && isHost && bullets.length > 0) {
      actions.sendBullets(bullets);
    }
  }, [bullets, actions, isHost]);

  // Sync hits across network (only host sends)
  useEffect(() => {
    if (actions.sendHits && isHost && hits.length > 0) {
      actions.sendHits(hits);
    }
  }, [hits, actions, isHost]);

  // Listen for network bullets
  useEffect(() => {
    if (actions.getBullets) {
      actions.getBullets((data) => {
        if (!isHost) {
          setNetworkBullets(data);
        }
      });
    }
  }, [actions, isHost]);

  // Listen for network hits
  useEffect(() => {
    if (actions.getHits) {
      actions.getHits((data) => {
        if (!isHost) {
          setNetworkHits(data);
        }
      });
    }
  }, [actions, isHost]);

  const onFire = (bullet) => {
    setBullets((bullets) => [...bullets, bullet]);
  };

  const onHit = (bulletId, position) => {
    setBullets((bullets) => bullets.filter((bullet) => bullet.id !== bulletId));
    setHits((hits) => [...hits, { id: bulletId, position }]);
  };

  const onHitEnded = (hitId) => {
    setHits((hits) => hits.filter((h) => h.id !== hitId));
  };

  const onKilled = (victim, killer) => {
    const killerPlayer = players.find((p) => p.id === killer);
    if (killerPlayer) {
      updatePlayerState(killer, {
        kills: (killerPlayer.state.kills || 0) + 1
      });
    }
  };

  return (
    <>
      <Map />
      {players.map((player) => (
        <CharacterController
          key={player.id}
          player={player}
          userPlayer={player.id === myPlayerId}
          joystick={joystick}
          onKilled={onKilled}
          onFire={onFire}
          downgradedPerformance={downgradedPerformance}
          isHost={isHost}
          updatePlayerState={updatePlayerState}
        />
      ))}
      {(isHost ? bullets : networkBullets).map((bullet) => (
        <Bullet
          key={bullet.id}
          {...bullet}
          onHit={(position) => onHit(bullet.id, position)}
          isHost={isHost}
        />
      ))}
      {(isHost ? hits : networkHits).map((hit) => (
        <BulletHit key={hit.id} {...hit} onEnded={() => onHitEnded(hit.id)} isHost={isHost} />
      ))}
      <Environment preset="sunset" />
    </>
  );
};

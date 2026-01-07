import { Environment } from "@react-three/drei";
import { useEffect, useState, useRef } from "react";
import { useTrysteroRoom } from "../hooks/useTrysteroRoom";
import { useJoystick } from "../hooks/useJoystick";
import { Bullet } from "./Bullet";
import { BulletHit } from "./BulletHit";
import { CharacterController } from "./CharacterController";
import { Map } from "./Map";

export const Experience = ({ downgradedPerformance = false }) => {
  const { players, myPlayerId, updatePlayerState, myPlayer, actions } = useTrysteroRoom();
  const [localBullets, setLocalBullets] = useState([]);
  const [localHits, setLocalHits] = useState([]);
  const [networkBullets, setNetworkBullets] = useState([]);
  const [networkHits, setNetworkHits] = useState([]);
  const sentBulletIdsRef = useRef(new Set());
  
  // Create joystick for local player
  const joystick = useJoystick();

  // Broadcast our own bullets to all peers (only new ones)
  useEffect(() => {
    if (actions.sendBullets && localBullets.length > 0) {
      // Only send bullets that belong to us and haven't been sent yet
      const myBullets = localBullets.filter(b => 
        b.player === myPlayerId && !sentBulletIdsRef.current.has(b.id)
      );
      if (myBullets.length > 0) {
        myBullets.forEach(b => sentBulletIdsRef.current.add(b.id));
        actions.sendBullets(myBullets);
      }
    }
  }, [localBullets, actions, myPlayerId]);

  // Broadcast our own hits to all peers
  useEffect(() => {
    if (actions.sendHits && localHits.length > 0) {
      actions.sendHits(localHits);
    }
  }, [localHits, actions]);

  // Listen for bullets from all peers
  useEffect(() => {
    if (actions.getBullets) {
      actions.getBullets((bullets, peerId) => {
        // Only add bullets from other players (not our own)
        const otherPlayerBullets = bullets.filter(b => b.player !== myPlayerId);
        if (otherPlayerBullets.length > 0) {
          setNetworkBullets(prev => {
            // Merge with existing, avoiding duplicates
            const existingIds = new Set(prev.map(b => b.id));
            const newBullets = otherPlayerBullets.filter(b => !existingIds.has(b.id));
            return [...prev, ...newBullets];
          });
        }
      });
    }
  }, [actions, myPlayerId]);

  // Listen for hits from all peers
  useEffect(() => {
    if (actions.getHits) {
      actions.getHits((hits) => {
        setNetworkHits(prev => {
          // Merge with existing, avoiding duplicates
          const existingIds = new Set(prev.map(h => h.id));
          const newHits = hits.filter(h => !existingIds.has(h.id));
          return [...prev, ...newHits];
        });
      });
    }
  }, [actions]);

  const onFire = (bullet) => {
    setLocalBullets((bullets) => [...bullets, bullet]);
  };

  const onHit = (bulletId, position) => {
    setLocalBullets((bullets) => bullets.filter((bullet) => bullet.id !== bulletId));
    setNetworkBullets((bullets) => bullets.filter((bullet) => bullet.id !== bulletId));
    setLocalHits((hits) => [...hits, { id: bulletId, position }]);
  };

  const onHitEnded = (hitId) => {
    setLocalHits((hits) => hits.filter((h) => h.id !== hitId));
    setNetworkHits((hits) => hits.filter((h) => h.id !== hitId));
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
          updatePlayerState={updatePlayerState}
        />
      ))}
      {[...localBullets, ...networkBullets].map((bullet) => (
        <Bullet
          key={bullet.id}
          {...bullet}
          onHit={(position) => onHit(bullet.id, position)}
        />
      ))}
      {[...localHits, ...networkHits].map((hit) => (
        <BulletHit key={hit.id} {...hit} onEnded={() => onHitEnded(hit.id)} />
      ))}
      <Environment preset="sunset" />
    </>
  );
};

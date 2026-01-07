import { joinRoom } from 'trystero';
import { useEffect, useState, useRef, useCallback } from 'react';

const CONFIG = {
  appId: 'treddizio-3d-p2p-game-v1'
};

const ROOM_NAME = 'global-room';

export function useTrysteroRoom() {
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const roomRef = useRef(null);
  const playersRef = useRef(new Map());
  const actionsRef = useRef({});
  const [isHost, setIsHost] = useState(false);
  const hostIdRef = useRef(null);

  useEffect(() => {
    // Generate local player ID
    const localId = Math.random().toString(36).substring(2, 15);
    setMyPlayerId(localId);
    
    // Join room
    const room = joinRoom(CONFIG, ROOM_NAME);
    roomRef.current = room;
    
    // Setup actions for syncing game state
    const [sendPlayerState, getPlayerState] = room.makeAction('playerState');
    const [sendBullets, getBullets] = room.makeAction('bullets');
    const [sendHits, getHits] = room.makeAction('hits');
    const [sendHostClaim, getHostClaim] = room.makeAction('hostClaim');
    
    actionsRef.current = {
      sendPlayerState,
      getPlayerState,
      sendBullets,
      getBullets,
      sendHits,
      getHits,
      sendHostClaim,
      getHostClaim
    };
    
    // Claim host if first player
    const claimHost = () => {
      sendHostClaim(localId);
      setTimeout(() => {
        if (!hostIdRef.current || hostIdRef.current === localId) {
          hostIdRef.current = localId;
          setIsHost(true);
        }
      }, 100);
    };
    
    claimHost();
    
    // Listen for host claims
    getHostClaim((claimedId, peerId) => {
      if (!hostIdRef.current || peerId < hostIdRef.current) {
        hostIdRef.current = claimedId;
        setIsHost(claimedId === localId);
      }
    });
    
    // Handle peer join
    room.onPeerJoin((peerId) => {
      console.log('Peer joined:', peerId);
      const newPlayer = {
        id: peerId,
        state: {
          health: 100,
          deaths: 0,
          kills: 0,
          dead: false,
          pos: null,
          profile: {
            name: `Player ${peerId.substring(0, 4)}`,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            photo: ''
          }
        }
      };
      
      playersRef.current.set(peerId, newPlayer);
      setPlayers(Array.from(playersRef.current.values()));
      
      // Send our state to new peer
      if (myPlayerId) {
        const myPlayer = playersRef.current.get(myPlayerId);
        if (myPlayer) {
          sendPlayerState({
            id: myPlayerId,
            state: myPlayer.state
          }, peerId);
        }
      }
    });
    
    // Handle peer leave
    room.onPeerLeave((peerId) => {
      console.log('Peer left:', peerId);
      playersRef.current.delete(peerId);
      setPlayers(Array.from(playersRef.current.values()));
      if (hostIdRef.current === peerId) {
        // Re-claim host if host left
        claimHost();
      }
    });
    
    // Listen for player state updates
    getPlayerState((data, peerId) => {
      const player = playersRef.current.get(peerId);
      if (player) {
        player.state = { ...player.state, ...data.state };
        setPlayers(Array.from(playersRef.current.values()));
      }
    });
    
    // Add local player
    const localPlayer = {
      id: localId,
      state: {
        health: 100,
        deaths: 0,
        kills: 0,
        dead: false,
        pos: null,
        profile: {
          name: `Player ${localId.substring(0, 4)}`,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          photo: ''
        }
      }
    };
    playersRef.current.set(localId, localPlayer);
    setPlayers(Array.from(playersRef.current.values()));
    
    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
      }
    };
  }, []);
  
  const updatePlayerState = useCallback((playerId, state) => {
    const player = playersRef.current.get(playerId);
    if (player) {
      player.state = { ...player.state, ...state };
      setPlayers(Array.from(playersRef.current.values()));
      
      // Broadcast to all peers
      if (actionsRef.current.sendPlayerState) {
        actionsRef.current.sendPlayerState({
          id: playerId,
          state: player.state
        });
      }
    }
  }, []);
  
  const getPlayer = useCallback((playerId) => {
    return playersRef.current.get(playerId);
  }, []);
  
  const myPlayer = useCallback(() => {
    return myPlayerId ? playersRef.current.get(myPlayerId) : null;
  }, [myPlayerId]);
  
  return {
    players,
    myPlayerId,
    isHost,
    updatePlayerState,
    getPlayer,
    myPlayer,
    actions: actionsRef.current
  };
}


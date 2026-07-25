"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bounds,
  useAnimations,
  useGLTF,
} from "@react-three/drei";

import {
  Canvas,
  useFrame,
} from "@react-three/fiber";

import {
  AnimationAction,
  Group,
  LoopOnce,
  LoopRepeat,
  Material,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SkinnedMesh,
} from "three";

type HexaAnimation =
  | "idle"
  | "walk"
  | "hello"
  | "talk"
  | "think"
  | "point"
  | "success";

type HexaWitch3DProps = {
  animation?: HexaAnimation;
  className?: string;
};

type RouteStep = {
  animation: HexaAnimation;
  x: number;
  y: number;
  duration: number;
};

const MODEL_PATH =
  "/models/hexa/HEXA_Witch_Chatbox_v1.glb";

const HEXA_AUDIO_PATHS = {
  steps: "/audio/hexa/hexa-steps.wav",
  laugh: "/audio/hexa/hexa-laugh.wav",
  magic: "/audio/hexa/hexa-magic.wav",
  success: "/audio/hexa/hexa-success.wav",
  helloVoice: "/audio/hexa/hexa-hello.mp3",
  thinkVoice: "/audio/hexa/hexa-think.mp3",
  pointVoice: "/audio/hexa/hexa-point-voice.mp3",
  successVoice: "/audio/hexa/hexa-success-voice.mp3",
} as const;

type HexaAudioCollection = {
  steps: HTMLAudioElement;
  laugh: HTMLAudioElement;
  magic: HTMLAudioElement;
  success: HTMLAudioElement;
  helloVoice: HTMLAudioElement;
  thinkVoice: HTMLAudioElement;
  pointVoice: HTMLAudioElement;
  successVoice: HTMLAudioElement;
};

const ACTION_NAMES: Record<
  HexaAnimation,
  string
> = {
  idle: "HEXA_IDLE",
  walk: "HEXA_WALK",
  hello: "HEXA_HELLO",
  talk: "HEXA_TALK",
  think: "HEXA_THINK",
  point: "HEXA_POINT",
  success: "HEXA_SUCCESS",
};

const LOOPING_ACTIONS =
  new Set<HexaAnimation>([
    "idle",
    "walk",
    "talk",
  ]);

const ROUTE: RouteStep[] = [
  {
    animation: "hello",
    x: 0,
    y: 0,
    duration: 2200,
  },
  {
    animation: "idle",
    x: 0,
    y: 0,
    duration: 1800,
  },
  {
    animation: "walk",
    x: -190,
    y: 0,
    duration: 3600,
  },
  {
    animation: "idle",
    x: -190,
    y: 0,
    duration: 1800,
  },
  {
    animation: "walk",
    x: -390,
    y: -85,
    duration: 3900,
  },
  {
    animation: "think",
    x: -390,
    y: -85,
    duration: 2400,
  },
  {
    animation: "talk",
    x: -390,
    y: -85,
    duration: 3000,
  },
  {
    animation: "walk",
    x: -210,
    y: -10,
    duration: 3700,
  },
  {
    animation: "point",
    x: -210,
    y: -10,
    duration: 2500,
  },
  {
    animation: "walk",
    x: 0,
    y: 0,
    duration: 3700,
  },
  {
    animation: "success",
    x: 0,
    y: 0,
    duration: 2800,
  },
  {
    animation: "idle",
    x: 0,
    y: 0,
    duration: 2600,
  },
];

function applyMaterialColor(
  sourceMaterial: Material,
  slotIndex: number,
): Material {
  const material = sourceMaterial.clone();

  if (
    !(
      material instanceof
      MeshStandardMaterial
    )
  ) {
    material.needsUpdate = true;
    return material;
  }

  if (slotIndex === 1) {
    material.name = "HEXA_SKIN_WEB";
    material.color.set("#80503d");
    material.roughness = 0.72;
    material.metalness = 0;
  } else {
    material.name = "HEXA_BLACK_WEB";
    material.color.set("#111018");
    material.roughness = 0.62;
    material.metalness = 0;
  }

  material.map = null;
  material.vertexColors = false;
  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.depthTest = true;
  material.envMapIntensity = 0.18;
  material.needsUpdate = true;

  return material;
}

function prepareScene(
  scene: Object3D,
): Object3D {
  scene.traverse((object) => {
    if (
      !(
        object instanceof Mesh ||
        object instanceof SkinnedMesh
      )
    ) {
      return;
    }

    object.frustumCulled = false;

    if (Array.isArray(object.material)) {
      object.material =
        object.material.map(
          (material, slotIndex) =>
            applyMaterialColor(
              material,
              slotIndex,
            ),
        );
    } else if (object.material) {
      const materialName =
        object.material.name.toUpperCase();

      object.material =
        applyMaterialColor(
          object.material,
          materialName.includes("SKIN")
            ? 1
            : 0,
        );
    }
  });

  return scene;
}

function findAction(
  actions: Record<
    string,
    AnimationAction | null
  >,
  requestedName: string,
): AnimationAction | null {
  const exact = actions[requestedName];

  if (exact) {
    return exact;
  }

  const requested =
    requestedName.toUpperCase();

  return (
    Object.entries(actions).find(
      ([name, action]) =>
        Boolean(action) &&
        name
          .toUpperCase()
          .includes(requested),
    )?.[1] ?? null
  );
}

function HexaModel({
  animation,
  direction,
}: {
  animation: HexaAnimation;
  direction: 1 | -1;
}) {
  const rotationGroupRef =
    useRef<Group>(null);

  const {
    scene,
    animations,
  } = useGLTF(MODEL_PATH);

  const preparedScene = useMemo(
    () => prepareScene(scene),
    [scene],
  );

  const {
    actions,
  } = useAnimations(
    animations,
    preparedScene,
  );

  const activeActionRef =
    useRef<AnimationAction | null>(
      null,
    );

  useEffect(() => {
    const nextAction =
      findAction(
        actions,
        ACTION_NAMES[animation],
      );

    if (!nextAction) {
      console.warn(
        "[HEXA 3D] Brak animacji:",
        ACTION_NAMES[animation],
        Object.keys(actions),
      );

      return;
    }

    const previousAction =
      activeActionRef.current;

    if (
      previousAction &&
      previousAction !== nextAction
    ) {
      previousAction.fadeOut(0.2);
    }

    nextAction.enabled = true;
    nextAction.paused = false;
    nextAction.clampWhenFinished =
      !LOOPING_ACTIONS.has(animation);

    if (LOOPING_ACTIONS.has(animation)) {
      nextAction.setLoop(
        LoopRepeat,
        Infinity,
      );
    } else {
      nextAction.setLoop(
        LoopOnce,
        1,
      );
    }

    nextAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(0.2)
      .play();

    activeActionRef.current =
      nextAction;

    return () => {
      nextAction.fadeOut(0.12);
    };
  }, [
    actions,
    animation,
  ]);

  useFrame(
    (_, delta) => {
      const group =
        rotationGroupRef.current;

      if (!group) {
        return;
      }

      const targetRotation =
        direction === 1
          ? 0
          : Math.PI;

      group.rotation.y =
        MathUtils.damp(
          group.rotation.y,
          targetRotation,
          8,
          delta,
        );
    },
  );

  return (
    <group ref={rotationGroupRef}>
      <primitive object={preparedScene} />
    </group>
  );
}

function LoadingIndicator() {
  return (
    <mesh>
      <sphereGeometry
        args={[0.07, 16, 16]}
      />

      <meshBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.25}
      />
    </mesh>
  );
}

export default function HexaWitch3D({
  animation = "idle",
  className = "",
}: HexaWitch3DProps) {
  const [
    activeAnimation,
    setActiveAnimation,
  ] = useState<HexaAnimation>(
    "hello",
  );

  const [
    position,
    setPosition,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    direction,
    setDirection,
  ] = useState<1 | -1>(1);

  const [
    movementDuration,
    setMovementDuration,
  ] = useState(2200);

  const audioCollectionRef =
    useRef<HexaAudioCollection | null>(
      null,
    );

  const audioUnlockedRef =
    useRef(false);

  const activeAnimationRef =
    useRef<HexaAnimation>("hello");

  const laughTimerRef =
    useRef<number | null>(null);

  useEffect(() => {
    const steps =
      new Audio(HEXA_AUDIO_PATHS.steps);

    const laugh =
      new Audio(HEXA_AUDIO_PATHS.laugh);

    const magic =
      new Audio(HEXA_AUDIO_PATHS.magic);

    const success =
      new Audio(HEXA_AUDIO_PATHS.success);

    const helloVoice =
      new Audio(HEXA_AUDIO_PATHS.helloVoice);

    const thinkVoice =
      new Audio(HEXA_AUDIO_PATHS.thinkVoice);

    const pointVoice =
      new Audio(HEXA_AUDIO_PATHS.pointVoice);

    const successVoice =
      new Audio(HEXA_AUDIO_PATHS.successVoice);

    steps.preload = "auto";
    laugh.preload = "auto";
    magic.preload = "auto";
    success.preload = "auto";
    helloVoice.preload = "auto";
    thinkVoice.preload = "auto";
    pointVoice.preload = "auto";
    successVoice.preload = "auto";

    steps.loop = true;

    steps.volume = 0.48;
    laugh.volume = 0.82;
    magic.volume = 0.72;
    success.volume = 0.76;
    helloVoice.volume = 0.92;
    thinkVoice.volume = 0.9;
    pointVoice.volume = 0.92;
    successVoice.volume = 0.92;

    audioCollectionRef.current = {
      steps,
      laugh,
      magic,
      success,
      helloVoice,
      thinkVoice,
      pointVoice,
      successVoice,
    };

    const unlockAudio = () => {
      audioUnlockedRef.current = true;

      const audios =
        audioCollectionRef.current;

      if (!audios) {
        return;
      }

      Object.values(audios).forEach(
        (audio) => {
          audio.load();
        },
      );

      if (
        activeAnimationRef.current ===
        "walk"
      ) {
        void audios.steps.play().catch(
          () => undefined,
        );
      }

      if (
        activeAnimationRef.current ===
        "hello"
      ) {
        audios.helloVoice.currentTime = 0;

        void audios.helloVoice
          .play()
          .catch(() => undefined);
      }
    };

    window.addEventListener(
      "pointerdown",
      unlockAudio,
      {
        once: true,
        passive: true,
      },
    );

    window.addEventListener(
      "keydown",
      unlockAudio,
      {
        once: true,
      },
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        unlockAudio,
      );

      window.removeEventListener(
        "keydown",
        unlockAudio,
      );

      if (laughTimerRef.current) {
        window.clearTimeout(
          laughTimerRef.current,
        );
      }

      Object.values(
        audioCollectionRef.current ?? {},
      ).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });

      audioCollectionRef.current = null;
    };
  }, []);

  const playOneShot = useCallback(
    (
      audio:
        | HTMLAudioElement
        | undefined,
    ) => {
      if (
        !audio ||
        !audioUnlockedRef.current
      ) {
        return;
      }

      audio.pause();
      audio.currentTime = 0;

      void audio.play().catch(
        () => undefined,
      );
    },
    [],
  );

  const setAnimationWithAudio =
    useCallback(
      (
        nextAnimation:
          HexaAnimation,
      ) => {
        activeAnimationRef.current =
          nextAnimation;

        setActiveAnimation(
          nextAnimation,
        );

        const audios =
          audioCollectionRef.current;

        if (!audios) {
          return;
        }

        if (
          nextAnimation === "walk"
        ) {
          if (
            audioUnlockedRef.current &&
            audios.steps.paused
          ) {
            audios.steps.currentTime = 0;

            void audios.steps
              .play()
              .catch(() => undefined);
          }
        } else {
          audios.steps.pause();
          audios.steps.currentTime = 0;
        }

        if (
          nextAnimation === "hello"
        ) {
          playOneShot(audios.helloVoice);
        }

        if (
          nextAnimation === "think"
        ) {
          playOneShot(audios.thinkVoice);
        }

        if (
          nextAnimation === "point"
        ) {
          playOneShot(audios.magic);

          window.setTimeout(() => {
            playOneShot(audios.pointVoice);
          }, 240);
        }

        if (
          nextAnimation === "success"
        ) {
          playOneShot(audios.success);

          window.setTimeout(() => {
            playOneShot(audios.successVoice);
          }, 220);

          if (laughTimerRef.current) {
            window.clearTimeout(
              laughTimerRef.current,
            );
          }

          laughTimerRef.current =
            window.setTimeout(() => {
              playOneShot(audios.laugh);
            }, 1500);
        }
      },
      [playOneShot],
    );

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let routeIndex = 0;

    const runStep = () => {
      if (cancelled) {
        return;
      }

      const step = ROUTE[routeIndex];

      setPosition((previous) => {
        if (step.x < previous.x) {
          setDirection(-1);
        } else if (step.x > previous.x) {
          setDirection(1);
        }

        return {
          x: step.x,
          y: step.y,
        };
      });

      setMovementDuration(step.duration);
      setAnimationWithAudio(step.animation);

      timer = window.setTimeout(
        () => {
          routeIndex =
            (routeIndex + 1) %
            ROUTE.length;

          runStep();
        },
        step.duration,
      );
    };

    runStep();

    return () => {
      cancelled = true;

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [setAnimationWithAudio]);

  return (
    <div
      className={[
        "pointer-events-none select-none overflow-visible",
        className,
      ].join(" ")}
      style={{
        transform:
          `translate3d(${position.x}px, ${position.y}px, 0)`,
        transitionProperty:
          "transform",
        transitionDuration:
          `${movementDuration}ms`,
        transitionTimingFunction:
          activeAnimation === "walk"
            ? "linear"
            : "ease-in-out",
        willChange: "transform",
      }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.25]}
        camera={{
          position: [0, 1.2, 4],
          fov: 32,
          near: 0.01,
          far: 100,
        }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference:
            "high-performance",
        }}
        style={{
          background: "transparent",
        }}
      >
        <ambientLight intensity={1.05} />

        <hemisphereLight
          intensity={0.62}
          color="#dcecff"
          groundColor="#0a0f18"
        />

        <directionalLight
          position={[4, 6, 5]}
          intensity={1.3}
        />

        <directionalLight
          position={[-3, 2, 3]}
          intensity={0.38}
        />

        <Suspense
          fallback={<LoadingIndicator />}
        >
          <Bounds
            fit
            clip
            observe
            margin={1.16}
          >
            <HexaModel
              animation={activeAnimation}
              direction={direction}
            />
          </Bounds>
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);
import { Composition, Folder } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { Logo } from "./HelloWorld/Logo";
import { Title } from "./HelloWorld/Title";
import {
  Fourier,
  FourierScene,
  calculateFourierMetadata,
  calculateSceneMetadata,
} from "./Fourier/Fourier";
import { SCENE_IDS } from "./Fourier/narration/timing";
import { FPS, HEIGHT, WIDTH } from "./Fourier/waves";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Elements">
        <Composition
          id="Logo"
          component={Logo}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            logoColor1: "#91EAE4",
            logoColor2: "#86A8E7",
          }}
        />
        <Composition
          id="Title"
          component={Title}
          durationInFrames={115}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            titleText: "Welcome to Remotion",
            titleColor: "#000000",
          }}
        />
      </Folder>
      <Composition
        id="Fourier"
        component={Fourier}
        // Real length comes from the narration audio (calculateMetadata).
        durationInFrames={1}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ durations: null }}
        calculateMetadata={calculateFourierMetadata}
      />
      <Folder name="Fourier-scenes">
        {SCENE_IDS.map((id) => (
          <Composition
            key={id}
            id={id}
            component={FourierScene}
            durationInFrames={1}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
            defaultProps={{ id, durations: null }}
            calculateMetadata={calculateSceneMetadata}
          />
        ))}
      </Folder>
      <Composition
        // You can take the "id" to render a video:
        // bunx remotion render HelloWorld
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        // You can override these props for each render:
        // https://www.remotion.dev/docs/parametrized-rendering
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
        }}
      />
    </>
  );
};

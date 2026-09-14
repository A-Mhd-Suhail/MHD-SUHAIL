import React from 'react';

type Props = { inline?: boolean };

const Loader: React.FC<Props> = ({ inline = false }) => {
  return (
    <div className={inline ? 'loader-inline' : 'loader-container'}>
      <section className={inline ? 'loader-section-inline' : 'loader-section'}>
        <div className="loader loader-1">
          <div className="loader-outter" />
          <div className="loader-inner" />
        </div>
      </section>

      <style>{`
        .loader-container {
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: black;
        }

        .loader-section {
          width: 30%;
          min-height: 215px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: #080915;
          border-radius: 5px;
          box-shadow: 0px 0px 30px 1px #103136 inset;
        }

        /* Inline variant used inside cards/containers */
        .loader-inline { display: flex; align-items: center; justify-content: center; }
        .loader-section-inline { display: inline-flex; align-items: center; justify-content: center; background: transparent; box-shadow: none; padding: 8px; }

        .loader {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: inline-block;
        }

        .loader-section-inline .loader { width: 28px; height: 28px; }
        .loader-section-inline .loader-1 .loader-outter,
        .loader-section-inline .loader-1 .loader-inner { border-width: 3px; }

        /* LOADER 1 */

        .loader-1 .loader-outter {
          position: absolute;
          border: 4px solid #126b50;
          border-left-color: transparent;
          border-bottom: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;

          animation: loader-1-outter 1s cubic-bezier(.42, .61, .58, .41) infinite;
        }

        .loader-1 .loader-inner {
          position: absolute;
          border: 4px solid #126b50;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          left: calc(50% - 20px);
          top: calc(50% - 20px);
          border-right: 0;
          border-top-color: transparent;

          animation: loader-1-inner 1s cubic-bezier(.42, .61, .58, .41) infinite;
        }

        /* KEYFRAMES */

        @keyframes loader-1-outter { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes loader-1-inner { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }

        @media only screen and (max-width: 600px) {
          .loader-section { width: 90%; min-width: 300px; }
        }
      `}</style>
    </div>
  );
};

export default Loader;
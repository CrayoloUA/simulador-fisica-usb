import 'react';

/*
 * React 19 crea los elementos MathML en su espacio de nombres, pero @types/react no los declara.
 * Solo se declaran los que usa `Formula`.
 */
declare module 'react' {
  namespace JSX {
    type MathAttributes = HTMLAttributes<HTMLElement> & ClassAttributes<HTMLElement> & { mathvariant?: 'normal';
      display?: 'inline' | 'block';
      stretchy?: 'true' | 'false';
      lspace?: string;
      rspace?: string;
    };
    interface IntrinsicElements {
      math: MathAttributes;
      mrow: MathAttributes;
      mi: MathAttributes;
      mn: MathAttributes;
      mo: MathAttributes;
      mspace: MathAttributes;
      mfrac: MathAttributes;
      msqrt: MathAttributes;
      msub: MathAttributes;
      msup: MathAttributes;
      msubsup: MathAttributes;
      munderover: MathAttributes;
    }
  }
}

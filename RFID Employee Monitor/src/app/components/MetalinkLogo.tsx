import logoImage from "./assets/metalink-logo.png";


export function MetalinkLogo({ className = "" }: { className?: string }) {
  return (
    <img 
      src={logoImage}
      alt="Metalink - Our Expertise. Your Expectations." 
      className={className}
    />
  );
}
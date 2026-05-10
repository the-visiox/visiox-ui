"use client";

export default function BlueprintGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(rgba(251, 146, 60, 0.28) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#fcfaf7] via-transparent to-transparent" />
    </div>
  );
}

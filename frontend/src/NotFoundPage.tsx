import React from 'react';
import { Link } from 'react-router-dom';
import { Network, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
    return (
        <div className="not-found-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex items-center justify-center min-h-[70vh]">
            <div className="terminal-404-container text-center max-w-2xl w-full">
                {/* Glitching Logo */}
                <div className="flex justify-center mb-8 glitch-wrapper">
                    <div className="icon-container glow pulse">
                        <Network size={64} className="text-[#00ff9d]" />
                    </div>
                </div>

                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00ff9d] to-[#00b8ff] mb-4 tracking-tighter error-glitch" data-text="404">
                    404
                </h1>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 tracking-wide">
                    SYS.FAULT: SECTOR NOT FOUND
                </h2>

                <div className="terminal-readout bg-black/40 backdrop-blur-md border border-[#00ff9d]/20 rounded-xl p-6 mb-10 text-left font-mono text-sm md:text-base text-gray-400">
                    <p className="mb-2"><span className="text-[#00ff9d]">&gt;</span> Analyzing destination vector...</p>
                    <p className="mb-2"><span className="text-[#00ff9d]">&gt;</span> ERR_CONNECTION_REFUSED</p>
                    <p className="mb-2"><span className="text-red-400">&gt;</span> WARNING: Route signature does not match any known local sectors.</p>
                    <p><span className="text-[#00ff9d] animate-pulse">_</span></p>
                </div>

                <Link to="/" className="inline-flex items-center gap-2 bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 px-8 py-4 rounded-lg font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,157,0.3)] group glow-button">
                    <ArrowLeft size={20} className="transform group-hover:-translate-x-1 transition-transform" />
                    RETURN TO UPLINK
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;

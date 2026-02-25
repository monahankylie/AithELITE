/**
 * FOOTER COMPONENT
 * The standard footer used across all pages of the application.
 */
import React from 'react';
import { Link } from "react-router";

const Footer = () => {
    return (
        <footer className="border-t border-black/10 bg-white py-8 mt-auto">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-black/50">
                    &copy; {new Date().getFullYear()} AithELITE. All rights reserved.
                </p>
                <div className="flex gap-6">
                    <Link to="/support" className="text-xs font-semibold text-black/60 hover:text-black transition">
                        Support
                    </Link>
                    <Link to="/privacy" className="text-xs font-semibold text-black/60 hover:text-black transition">
                        Privacy
                    </Link>
                    <Link to="/terms" className="text-xs font-semibold text-black/60 hover:text-black transition">
                        Terms
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

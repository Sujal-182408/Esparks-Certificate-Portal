
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, QrCode, ShieldCheck } from "lucide-react";

import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#080b10] text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-5">
        <section className="relative flex min-h-[78vh] flex-col items-center justify-center py-20 text-center">
          <div
            className="
              pointer-events-none
              absolute
              left-1/2
              top-1/2
              z-0
              h-80
              w-80
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-cyan-400/10
              blur-[120px]
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -left-40
              top-20
              z-0
              h-72
              w-72
              rounded-full
              bg-blue-500/10
              blur-[110px]
            "
          />

          <div
            className="
              relative
              z-10
              mb-7
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-cyan-400/20
              bg-cyan-400/10
              px-4
              py-2
              text-sm
              font-medium
              text-cyan-300
            "
          >
            <ShieldCheck size={17} />
            <span>Secure Certificate Verification</span>
          </div>

          <h1
            className="
              relative
              z-10
              max-w-4xl
              text-4xl
              font-extrabold
              leading-tight
              tracking-tight
              sm:text-5xl
              md:text-6xl
              lg:text-7xl
            "
          >
            Verify Certificates
            <br />
            <span
              className="
                bg-linear-to-r
                from-cyan-300
                via-cyan-400
                to-blue-500
                bg-clip-text
                text-transparent
              "
            >
              With Confidence.
            </span>
          </h1>

          <p
            className="
              relative
              z-10
              mt-6
              max-w-2xl
              text-base
              leading-7
              text-slate-400
              sm:text-lg
            "
          >
            ESPARKS IT SOLUTIONS provides a secure and reliable way to verify certificates
            using unique verification tokens and QR codes.
          </p>

          <div
            className="
              relative
              z-10
              mt-9
              flex
              w-full
              flex-col
              items-center
              justify-center
              gap-4
              sm:flex-row
            "
          >
            <Link
              to="/login"
              className="
                group
                inline-flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-cyan-400
                px-6
                text-sm
                font-bold
                text-slate-950
                shadow-lg
                shadow-cyan-500/10
                transition-all
                duration-200
                hover:bg-cyan-300
                hover:shadow-cyan-400/20
                active:scale-[0.98]
                sm:w-auto
              "
            >
              Employee Login
              <ArrowRight
                size={18}
                className="
                  transition-transform
                  duration-200
                  group-hover:translate-x-1
                "
              />
            </Link>

            <Link
              to="/verify"
              className="
                inline-flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-white/10
                bg-white/5
                px-6
                text-sm
                font-semibold
                text-white
                transition-all
                duration-200
                hover:border-cyan-400/30
                hover:bg-cyan-400/10
                hover:text-cyan-300
                active:scale-[0.98]
                sm:w-auto
              "
            >
              <QrCode size={18} />
              Verify Certificate
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 pb-20 md:grid-cols-3">
          <div
            className="
              group
              rounded-2xl
              border
              border-white/10
              bg-white/3
              p-7
              shadow-xl
              backdrop-blur-xl
              transition-all
              duration-300
              hover:-translate-y-1
              hover:border-cyan-400/20
              hover:bg-white/5
            "
          >
            <div
              className="
                mb-5
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                border
                border-cyan-400/20
                bg-cyan-400/10
                text-cyan-400
                transition-all
                duration-300
                group-hover:bg-cyan-400/20
              "
            >
              <QrCode size={23} />
            </div>

            <h3 className="text-xl font-semibold text-white">QR Verification</h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Scan a certificate QR code to securely verify its authenticity.
            </p>
          </div>

          <div
            className="
              group
              rounded-2xl
              border
              border-white/10
              bg-white/3
              p-7
              shadow-xl
              backdrop-blur-xl
              transition-all
              duration-300
              hover:-translate-y-1
              hover:border-cyan-400/20
              hover:bg-white/5
            "
          >
            <div
              className="
                mb-5
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                border
                border-cyan-400/20
                bg-cyan-400/10
                text-cyan-400
                transition-all
                duration-300
                group-hover:bg-cyan-400/20
              "
            >
              <ShieldCheck size={23} />
            </div>

            <h3 className="text-xl font-semibold text-white">Secure Tokens</h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Every certificate uses a unique verification token to prevent
              unauthorized access.
            </p>
          </div>

          <div
            className="
              group
              rounded-2xl
              border
              border-white/10
              bg-white/3
              p-7
              shadow-xl
              backdrop-blur-xl
              transition-all
              duration-300
              hover:-translate-y-1
              hover:border-cyan-400/20
              hover:bg-white/5
            "
          >
            <div
              className="
                mb-5
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                border
                border-cyan-400/20
                bg-cyan-400/10
                text-cyan-400
                transition-all
                duration-300
                group-hover:bg-cyan-400/20
              "
            >
              <BadgeCheck size={23} />
            </div>

            <h3 className="text-xl font-semibold text-white">
              Trusted Certificates
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Verify certificate information directly against the ESPARKS IT SOLUTIONS
              system.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

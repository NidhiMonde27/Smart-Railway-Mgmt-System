import ReactCapture from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  QrCode,
  Map,
  Bell,
  ChevronRight,
  Train,
  Users,
  Shield,
  ChevronLeft,
} from "lucide-react";
import { useState, useEffect } from "react";

const LandingPage = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    "/images/trains.jpg",
    "/images/new-ac-local-trains-for-mumbai.jpg",
    "/images/mumbai-local-110521667-16x9_0.jpg",

    "/images/download.jpg",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000); // Change image every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
  };

  const previousImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + heroImages.length) % heroImages.length,
    );
  };
  return (
    <div className="min-h-screen font-sans flex flex-col">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-4 border-b-transparent"
        style={{
          borderImage: "linear-gradient(to right, #FF9933, #FFFFFF, #138808) 1",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border-2 border-brand-navy animate-spin-slow"
                  style={{ animationDuration: "10s" }}
                ></div>
                <Train className="w-6 h-6 text-brand-navy" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter leading-none">
                  <span className="text-brand-saffron">APLI</span>
                  <span className="text-brand-navy mx-1">-</span>
                  <span className="text-brand-green">MUMBAI</span>
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/map"
                className="font-bold text-gray-700 hover:text-brand-saffron transition-colors"
              >
                Live Map
              </Link>
              <Link
                to="/ticketing"
                className="font-bold text-gray-700 hover:text-brand-navy transition-colors"
              >
                Ticketing
              </Link>
              <Link
                to="/login"
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-brand-saffron via-brand-white to-brand-green text-brand-navy font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-brand-navy opacity-0 group-hover:opacity-10 transition-opacity"></span>
                <span className="relative text-shadow-sm flex items-center">
                  Login{" "}
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg"
                    className="w-6 h-4 ml-2 border border-white/20 shadow-sm"
                    alt="India"
                  />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[650px] flex items-center">
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm"></div>

        {/* Ashoka Chakra Decorative Element */}
        <div className="absolute top-1/2 right-[-100px] w-[600px] h-[600px] border-[40px] border-brand-navy/5 rounded-full animate-spin-slow -translate-y-1/2 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-brand-navy/5 border border-brand-navy/10 text-brand-navy text-xs font-bold mb-8 uppercase tracking-wider">
                <span className="w-2 h-2 bg-brand-saffron rounded-full mr-2"></span>
                Proudly Made in India
                <span className="w-2 h-2 bg-brand-green rounded-full ml-2"></span>
              </div>
              <h1 className="text-6xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-8">
                <span className="text-brand-saffron">Desh Ki</span>
                <br />
                <span className="text-brand-navy">Raftaar.</span>
                <br />
                <span className="text-brand-green">Mumbai Ki Shaan.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed font-medium">
                Celebrating the spirit of Mumbai with a smarter, safer, and faster commute for every Mumbaikar.
              </p>

              <div className="flex flex-col sm:flex-row gap-5">
                <Link
                  to="/live-status"
                  className="group flex items-center justify-center px-8 py-4 rounded-xl bg-brand-navy text-white font-bold text-lg shadow-lg hover:bg-brand-saffron transition-all duration-300"
                >
                  Check Live Status
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/digital-ticket"
                  className="flex items-center justify-center px-8 py-4 rounded-xl border-2 border-brand-navy text-brand-navy font-bold text-lg hover:bg-brand-navy hover:text-white transition-all"
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Digital Ticket
                </Link>
              </div>
            </div>
            {/* Hero Image/Illustration with Carousel */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-saffron/20 via-transparent to-brand-green/20 rounded-full blur-3xl"></div>

              {/* Carousel Container */}
              <div className="relative rounded-3xl shadow-2xl border-4 border-white overflow-hidden h-[500px] w-full group">
                {/* Images */}
                {heroImages.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Mumbai Local ${index + 1}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                      index === currentImageIndex ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}

                {/* Navigation Buttons */}
                <button
                  onClick={previousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 hover:bg-white text-brand-navy shadow-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 hover:bg-white text-brand-navy shadow-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Dots Indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {heroImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? "bg-white w-8"
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Floating Stats Card */}
              <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-2xl shadow-xl border-l-4 border-brand-saffron flex items-center space-x-4 animate-bounce-slow">
                <div className="p-3 bg-orange-100 rounded-full text-brand-saffron">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">7.5M+</p>
                  <p className="text-xs text-gray-500 font-bold uppercase">
                    Daily Passengers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Features Grid */}
      <section className="py-24 relative z-10">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h3 className="text-brand-navy font-bold tracking-wider uppercase text-sm mb-2">
              Our Smart Features
            </h3>
            <h2 className="text-4xl font-extrabold text-gray-900">
              Modernizing Your Daily Commute
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Users className="w-6 h-6 text-brand-navy" />}
              title="Real-Time Crowd Levels"
              desc="Avoid the 'Super Dense Crush Load'. Live occupancy data helps you choose the right train coach."
              link="Learn more"
            />
            <FeatureCard
              icon={<QrCode className="w-6 h-6 text-brand-navy" />}
              title="Instant QR Ticketing"
              desc="No more queues at ATVMs. Book season passes or single journey tickets instantly."
              link="Start Booking"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-brand-navy" />}
              title="Smart AI Routing"
              desc="Our AI calculates suggested routes balancing time, cost, and crowd density."
              link="Plan Journey"
            />
          </div>
        </div>
      </section>

      {/* Map Teaser */}
      <section className="py-20 relative z-10">
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden relative border border-white/20 bg-brand-navy/90 backdrop-blur-md">
            <div className="relative z-10 md:w-1/2">
              <h2 className="text-3xl font-bold text-white mb-4">
                Interactive Live Map
              </h2>
              <p className="text-blue-100 mb-8">
                Track every train on the Western, Central, and Harbour lines in
                real-time. Visualize delays and find your train instantly.
              </p>
              <button className="px-6 py-3 bg-white text-brand-navy font-bold rounded-lg hover:bg-gray-100 transition-colors">
                Open Full Screen Map
              </button>
            </div>
            {/* Decorative map mockup would go here */}
            <div className="absolute right-0 top-0 h-full w-1/2 bg-blue-800/50 hidden md:block rotate-12 translate-x-12 scale-110 opacity-50"></div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-12 backdrop-blur-md bg-white/30 border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Train className="w-6 h-6 text-brand-navy" />
            <span className="text-2xl font-bold text-brand-navy">
              SMART RAIL MUMBAI
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 Ministry of Railways & MMRDA. Digital India Initiative.
          </p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, link }) => (
  <div className="p-8 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-300 group">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-white flex items-center justify-center mb-6 group-hover:bg-brand-navy group-hover:text-white transition-colors shadow-inner">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-700 leading-relaxed mb-4 font-medium">{desc}</p>
    <a
      href="#"
      className="text-brand-navy font-bold text-sm flex items-center group-hover:underline"
    >
      {link} <ChevronRight className="w-4 h-4 ml-1" />
    </a>
  </div>
);

export default LandingPage;

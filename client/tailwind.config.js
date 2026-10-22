/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    saffron: '#FF9933', // Tiranga Saffron
                    white: '#FFFFFF',   // Tiranga White
                    green: '#138808',   // Tiranga Green
                    navy: '#000080',    // Ashoka Chakra Blue
                    dark: '#1F2937',
                    light: '#F9FAFB',
                },
                tiranga: {
                    saffron: '#FF9933',
                    green: '#138808',
                    blue: '#000080',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
                'glow': '0 0 15px rgba(255, 153, 51, 0.3)',
            }
        }
    }
},
plugins: [],
}

import React from 'react'
import { motion } from 'motion/react'

export function TestimonialsColumn({ className, testimonials, duration = 10 }) {
  return (
    <div className={className}>
      <motion.div
        animate={{ translateY: '-50%' }}
        transition={{ duration, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
        className="flex flex-col gap-6 pb-6"
      >
        {[...Array(2)].map((_, index) => (
          <React.Fragment key={index}>
            {testimonials.map(({ text, image, name, role }, i) => (
              <div key={i} className="p-6 rounded-3xl border border-gray-100 shadow-lg shadow-violet-500/5 bg-white max-w-xs w-full">
                <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
                <div className="flex items-center gap-3 mt-5">
                  <img src={image} alt={name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 leading-tight">{name}</div>
                    <div className="text-xs text-gray-400 leading-tight mt-0.5">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  )
}

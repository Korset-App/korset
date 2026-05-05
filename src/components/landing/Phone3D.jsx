import React from 'react' // eslint-disable-line no-unused-vars

export default function Phone3D() {
  return (
    <div className="css-3d-scene">
      <div className="css-3d-phone">
        {/* Phone Case */}
        <div className="phone-case">
          <div className="phone-side phone-side--front">
            <div className="phone-screen">
              <div className="phone-content">
                <div className="phone-header">
                  <div className="phone-logo">KÖRSET</div>
                </div>
                <div className="phone-app-preview">
                  <div className="preview-chip">Allergens</div>
                  <div className="preview-chip">Halal</div>
                  <div className="preview-status">MATCH</div>
                </div>
              </div>
              <div className="phone-notch"></div>
            </div>
          </div>
          <div className="phone-side phone-side--back"></div>
          <div className="phone-side phone-side--right"></div>
          <div className="phone-side phone-side--left"></div>
          <div className="phone-side phone-side--top"></div>
          <div className="phone-side phone-side--bottom"></div>
        </div>
        {/* Glow Effect */}
        <div className="phone-glow"></div>
      </div>
    </div>
  )
}

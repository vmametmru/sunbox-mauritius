// Updated QuoteBuilder.tsx to ensure proper numeric addition

import React from 'react';

const QuoteBuilder = ({ items }) => {
    const calculateTotalPrice = () => {
        return items.reduce((total, item) => {
            const price = Number(item.price); // Ensure price is treated as a number
            return total + price; // Use numeric addition
        }, 0);
    };

    return (
        <div>
            <h1>Total Price: ${calculateTotalPrice().toFixed(2)}</h1>
        </div>
    );
};

export default QuoteBuilder;
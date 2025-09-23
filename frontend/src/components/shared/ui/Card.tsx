import { Card as CardType } from '@/types/card';
import Image from 'next/image';
import { getProductImageIcon } from '@/lib/imageUtils';

interface CardProps {
  card: CardType;
  onClick?: (card: CardType) => void;
}

export function Card({ card, onClick }: CardProps) {
  const handleClick = () => {
    onClick?.(card);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative aspect-[3/4] rounded-t-lg overflow-hidden">
        <Image
          src={card.product_id ? getProductImageIcon(card.product_id) : '/placeholder-card.png'}
          alt={card.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          onError={(e) => {
            // Replace with "Coming Soon" placeholder for locked images
            const target = e.target as HTMLImageElement;
            if (target.parentElement) {
              target.parentElement.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 p-4">
                  <svg class="w-16 h-16 mb-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                  </svg>
                  <div class="text-center">
                    <div class="text-sm font-medium text-gray-200 mb-1">Image Coming Soon</div>
                    <div class="text-xs text-gray-400">Card not yet released</div>
                  </div>
                </div>
              `;
            }
          }}
          unoptimized={true}
        />
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">
          {card.name}
        </h3>
        
        {card.price && (
          <div className="text-lg font-bold text-blue-600">
            ${card.price.toFixed(2)}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-1">
          {card.game}
        </div>
      </div>
    </div>
  );
}

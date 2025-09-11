import { Card as CardType } from '@/types/card';
import Image from 'next/image';

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
          src={card.image_url}
          alt={card.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
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

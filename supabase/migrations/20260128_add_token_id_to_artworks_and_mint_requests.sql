-- Add token_id column to artworks table
ALTER TABLE artworks 
ADD COLUMN token_id TEXT DEFAULT NULL;

-- Add token_id column to mint_requests table for traceability
ALTER TABLE mint_requests
ADD COLUMN token_id TEXT DEFAULT NULL;

-- Add index for token_id for faster queries
CREATE INDEX idx_artworks_token_id ON artworks(token_id);
CREATE INDEX idx_mint_requests_token_id ON mint_requests(token_id);

-- Add comment explaining the token_id column
COMMENT ON COLUMN artworks.token_id IS 'The ERC-721 token ID of the minted NFT on Polygon';
COMMENT ON COLUMN mint_requests.token_id IS 'The ERC-721 token ID of the minted NFT on Polygon';


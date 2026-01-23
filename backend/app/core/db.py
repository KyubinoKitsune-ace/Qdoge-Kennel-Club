import asyncio
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    create_engine,
    text,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)

from app.core.config import DATABASE_URL


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────

class UserRole(str, PyEnum):
    """User role enum."""
    NORMAL = "normal"
    ADMIN = "admin"


class TradeType(str, PyEnum):
    """Trade type/side enum."""
    BUY = "buy"
    SELL = "sell"


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    """
    Users table - stores basic user/account information including balances.
    
    Attributes:
        wallet_id: Primary key, unique identifier for the user (wallet address).
        qubic_bal: Current balance of Qubic tokens the user holds.
        qdoge_bal: Current balance of Qdoge tokens the user holds.
        role: User role or type (normal user, admin, etc.).
        created_at: Timestamp when the user was created.
        updated_at: Timestamp when the user was last updated.
    """
    __tablename__ = "user"

    wallet_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    qubic_bal: Mapped[Decimal] = mapped_column(
        Numeric(precision=38, scale=0), 
        default=0,
        nullable=False
    )
    qdoge_bal: Mapped[Decimal] = mapped_column(
        Numeric(precision=38, scale=0), 
        default=0,
        nullable=False
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.NORMAL,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    trades_as_taker: Mapped[list["Trade"]] = relationship(
        back_populates="taker",
        foreign_keys="Trade.taker_wallet"
    )
    trades_as_maker: Mapped[list["Trade"]] = relationship(
        back_populates="maker",
        foreign_keys="Trade.maker_wallet"
    )
    airdrop_results: Mapped[list["AirdropResult"]] = relationship(
        back_populates="user"
    )

    def __repr__(self) -> str:
        return f"<User(wallet_id={self.wallet_id})>"


class Trade(Base):
    """
    Trades table - append-only ledger of all token purchase/sale transactions.
    
    This table is immutable: once inserted, records are never updated or deleted.
    This enforces an audit trail and ensures historical accuracy.
    
    Attributes:
        trade_id: Primary key for the trade (auto-increment).
        type: Trade type/side ('buy' or 'sell').
        price: Price of Qdoge in terms of Qubic at the time of trade.
        quantity: Amount of Qdoge tokens traded.
        tx_hash: Transaction hash for uniqueness and traceability.
        taker_wallet: FK to Users - the wallet_id of the taker.
        maker_wallet: FK to Users - the wallet_id of the maker.
        tickdate: Timestamp of when the trade occurred.
    
    Notes:
        - If type='buy', taker_wallet is the buyer of Qdoge.
        - If type='sell', maker_wallet is the buyer of Qdoge.
    """
    __tablename__ = "trade"

    trade_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    type: Mapped[TradeType] = mapped_column(
        Enum(TradeType, name="trade_type"),
        nullable=False
    )
    price: Mapped[Decimal] = mapped_column(
        Numeric(precision=38, scale=18),
        nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(precision=38, scale=0),
        nullable=False
    )
    tx_hash: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False
    )
    taker_wallet: Mapped[str] = mapped_column(
        String(60),
        ForeignKey("user.wallet_id", ondelete="RESTRICT"),
        nullable=False
    )
    maker_wallet: Mapped[str] = mapped_column(
        String(60),
        ForeignKey("user.wallet_id", ondelete="RESTRICT"),
        nullable=False
    )
    tickdate: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    # Relationships
    taker: Mapped["User"] = relationship(
        back_populates="trades_as_taker",
        foreign_keys=[taker_wallet]
    )
    maker: Mapped["User"] = relationship(
        back_populates="trades_as_maker",
        foreign_keys=[maker_wallet]
    )

    # Indexes for performance
    __table_args__ = (
        Index("ix_trade_tickdate_taker", "tickdate", "taker_wallet"),
        Index("ix_trade_tickdate_maker", "tickdate", "maker_wallet"),
        Index("ix_trade_taker_wallet", "taker_wallet"),
        Index("ix_trade_maker_wallet", "maker_wallet"),
        CheckConstraint("price > 0", name="ck_trade_price_positive"),
        CheckConstraint("quantity > 0", name="ck_trade_quantity_positive"),
    )

    def __repr__(self) -> str:
        return f"<Trade(id={self.trade_id}, type={self.type}, quantity={self.quantity})>"


class Epoch(Base):
    """
    Epochs table - defines time periods for tracking trading activity for airdrops.
    
    Each epoch represents one week during which purchases are tracked.
    
    Attributes:
        epoch_num: Primary key, sequential number identifying the epoch.
        start_tick: Timestamp marking the start of the epoch.
        end_tick: Timestamp marking the end of the epoch.
        total_airdrop: Total amount of tokens allocated for the airdrop in this epoch.
    """
    __tablename__ = "epoch"

    epoch_num: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    start_tick: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    end_tick: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    total_airdrop: Mapped[Decimal] = mapped_column(
        Numeric(precision=38, scale=0),
        default=0,
        nullable=False
    )

    # Relationships
    airdrop_results: Mapped[list["AirdropResult"]] = relationship(
        back_populates="epoch"
    )

    __table_args__ = (
        CheckConstraint("end_tick > start_tick", name="ck_epoch_valid_range"),
        CheckConstraint("total_airdrop >= 0", name="ck_epoch_airdrop_non_negative"),
        Index("ix_epoch_start_tick", "start_tick"),
        Index("ix_epoch_end_tick", "end_tick"),
    )

    def __repr__(self) -> str:
        return f"<Epoch(num={self.epoch_num}, start={self.start_tick}, end={self.end_tick})>"


class AirdropResult(Base):
    """
    Airdrop Results table - stores the outcome of each epoch's airdrop.
    
    Contains the top 10 buyers of each epoch and their rewards.
    
    Attributes:
        epoch_num: FK to Epochs, indicating which epoch the result is for.
        grade: The rank of this user (1-10, where 1 is highest purchaser).
        wallet_id: FK to Users, the user who achieved this rank.
        user_buy_amount: Total Qdoge purchase value during the epoch (in Qubic).
        user_airdrop_amount: Amount of airdrop reward allocated to this user.
    """
    __tablename__ = "airdrop_result"

    epoch_num: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("epoch.epoch_num", ondelete="CASCADE"),
        primary_key=True
    )
    grade: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )
    wallet_id: Mapped[str] = mapped_column(
        String(60),
        ForeignKey("user.wallet_id", ondelete="RESTRICT"),
        nullable=False
    )
    user_buy_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=38, scale=0),
        nullable=False
    )
    user_airdrop_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=38, scale=0),
        nullable=False
    )

    # Relationships
    epoch: Mapped["Epoch"] = relationship(back_populates="airdrop_results")
    user: Mapped["User"] = relationship(back_populates="airdrop_results")

    __table_args__ = (
        # Each user can only appear once per epoch
        UniqueConstraint("epoch_num", "wallet_id", name="uq_airdrop_epoch_wallet"),
        # Grade must be between 1 and 10
        CheckConstraint("grade >= 1 AND grade <= 10", name="ck_airdrop_grade_range"),
        CheckConstraint("user_buy_amount >= 0", name="ck_airdrop_buy_amount_non_negative"),
        CheckConstraint("user_airdrop_amount >= 0", name="ck_airdrop_amount_non_negative"),
        Index("ix_airdrop_result_wallet", "wallet_id"),
        Index("ix_airdrop_result_epoch", "epoch_num"),
    )

    def __repr__(self) -> str:
        return f"<AirdropResult(epoch={self.epoch_num}, grade={self.grade}, wallet={self.wallet_id})>"


# ─────────────────────────────────────────────────────────────────────────────
# Database Initialization
# ─────────────────────────────────────────────────────────────────────────────

def get_sync_database_url() -> str:
    """
    Convert async database URL to sync for table creation.
    SQLAlchemy's create_all requires a sync engine.
    """
    url = DATABASE_URL
    if "+asyncpg" in url:
        url = url.replace("+asyncpg", "")
    return url


def init_db() -> None:
    """
    Initialize the database by creating all tables.
    
    This function creates the following tables if they don't exist:
    - user: User accounts and balances
    - trade: Immutable ledger of all trades
    - epoch: Weekly epoch definitions
    - airdrop_result: Top 10 buyers and rewards per epoch
    
    All tables are created with appropriate indexes and constraints
    for optimal query performance and data integrity.
    """
    sync_url = get_sync_database_url()
    engine = create_engine(sync_url, echo=True)
    
    # Create all tables
    Base.metadata.create_all(engine)
    
    print("Database tables created successfully:")
    print("  - user")
    print("  - trade")
    print("  - epoch")
    print("  - airdrop_result")
    
    engine.dispose()


# ─────────────────────────────────────────────────────────────────────────────
# Async Engine Factory (for runtime use)
# ─────────────────────────────────────────────────────────────────────────────

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Async engine for runtime operations
async_engine = create_async_engine(DATABASE_URL, echo=False)

# Async session factory
async_session_factory = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_async_session() -> AsyncSession:
    """
    Dependency to get an async database session.
    
    Usage with FastAPI:
        @app.get("/users")
        async def get_users(session: AsyncSession = Depends(get_async_session)):
            ...
    """
    async with async_session_factory() as session:
        yield session

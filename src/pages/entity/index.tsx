import { Link, useParams } from "react-router-dom";
import OrderEntity from "./components/OrderEntity";
import EntityTrades from "./components/EntityTrades";
import EntityTransfers from "./components/EntityTransfers";
import { Map, Copy } from "lucide-react";
import { EXPLORER_URL } from "@/constants";
import { copyText } from "@/utils";

const Entity: React.FC = () => {

    const { entity } = useParams<{ entity: string }>();

    if (!entity) {
        return null;
    }

    const panelClass =
        "flex w-full flex-col overflow-hidden";

    return (
        <main className="relative isolate flex min-h-[calc(100vh-140px)] w-full justify-center bg-background px-4 py-8 sm:px-6 lg:px-10">
            <div>
                <div className='flex items-center justify-center gap-2 p-1 mb-2 w-full bg-muted-foreground/30 border border-border/60 rounded-md'>
                    <span className="text-sm font-bold text-foreground font-mono uppercase break-all flex-1 text-center">{entity}</span>
                    <button
                        onClick={() => copyText(entity)}
                        className="flex-shrink-0 p-1 hover:bg-muted/40 rounded transition-colors cursor-pointer"
                        title="Copy address"
                    >
                        <Copy size={16} className="text-foreground" />
                    </button>
                    <Link 
                        to={`${EXPLORER_URL}/network/address/${entity}`} 
                        target="_blank"
                        className="flex-shrink-0 p-1.5 hover:bg-muted/40 rounded transition-colors"
                        title="View in explorer"
                    >
                        <Map size={16} className="text-foreground" />
                    </Link>
                </div>
                <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-2">
                    <section className={`${panelClass} h-[240px]`}>
                        <OrderEntity entity={entity} type="asks" />
                    </section>
                    <section className={`${panelClass} h-[240px]`}>
                        <OrderEntity entity={entity} type="bids" />
                    </section>
                    <section className={`${panelClass} h-[240px] lg:col-span-2`}>
                        <EntityTrades entity={entity} />
                    </section>
                    <section className={`${panelClass} h-[240px] lg:col-span-2`}>
                        <EntityTransfers entity={entity} />
                    </section>
                </div>
            </div>
        </main>
    );
};

export default Entity;
